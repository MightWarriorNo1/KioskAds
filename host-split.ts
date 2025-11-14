// deno-lint-ignore-file no-explicit-any
// Shared helper for calculating host commission splits on Stripe payments
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

type Metadata = Record<string, string>

interface HostSplitParams {
  supabase: SupabaseClient<any, any, any>
  kioskIds: string[]
  amount: number // already in smallest currency unit (cents)
  metadata?: Metadata
}

interface HostSplitConfig {
  transfer_data?: {
    destination: string
  }
  application_fee_amount?: number
  metadata?: Metadata
}

export async function getHostSplitConfig({
  supabase,
  kioskIds,
  amount,
  metadata = {},
}: HostSplitParams): Promise<HostSplitConfig | null> {
  if (!kioskIds || kioskIds.length === 0 || !amount || amount <= 0) {
    return null
  }

  try {
    const uniqueKioskIds = [...new Set(kioskIds.filter(Boolean))]
    if (uniqueKioskIds.length === 0) {
      return null
    }

    const { data: hostKiosks, error: hostKioskError } = await supabase
      .from('host_kiosks')
      .select('kiosk_id, host_id, commission_rate')
      .in('kiosk_id', uniqueKioskIds)
      .eq('status', 'active')

    if (hostKioskError) {
      console.error('Error fetching host kiosk assignments:', hostKioskError)
      return null
    }

    if (!hostKiosks || hostKiosks.length === 0) {
      return null
    }

    const hostIds = [...new Set(hostKiosks.map((hk) => hk.host_id))]
    if (hostIds.length === 0) {
      return null
    }

    const { data: hostProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_connect_account_id, stripe_connect_enabled')
      .in('id', hostIds)

    if (profileError) {
      console.error('Error fetching host profiles:', profileError)
      return null
    }

    const profileMap = new Map<string, { stripe_connect_account_id: string | null; stripe_connect_enabled: boolean | null }>()
    for (const profile of hostProfiles || []) {
      profileMap.set(profile.id, {
        stripe_connect_account_id: profile.stripe_connect_account_id,
        stripe_connect_enabled: profile.stripe_connect_enabled,
      })
    }

    const hostMap = new Map<
      string,
      {
        stripeAccountId: string
        commissionRate: number
        kioskCount: number
      }
    >()

    for (const hk of hostKiosks) {
      const hostId = hk.host_id
      const profile = profileMap.get(hostId)
      const stripeAccountId = profile?.stripe_connect_account_id
      const stripeEnabled = profile?.stripe_connect_enabled

      if (!stripeAccountId || !stripeEnabled) {
        continue
      }

      const commissionRateRaw = parseFloat(hk.commission_rate || '70.00')
      const commissionRate = Number.isFinite(commissionRateRaw) ? Math.min(Math.max(commissionRateRaw, 0), 100) : 70

      if (!hostMap.has(hostId)) {
        hostMap.set(hostId, {
          stripeAccountId,
          commissionRate,
          kioskCount: 0,
        })
      }
      const hostInfo = hostMap.get(hostId)!
      hostInfo.kioskCount += 1
    }

    if (hostMap.size !== 1) {
      // Either no eligible hosts or multiple hosts involved -> can't split directly
      return null
    }

    const hostEntry = Array.from(hostMap.values())[0]

    // Ensure all kiosks in the request are owned by this host
    const hostKioskSet = new Set(hostKiosks.map((hk) => hk.kiosk_id))
    const allKiosksCovered = uniqueKioskIds.every((id) => hostKioskSet.has(id))
    if (!allKiosksCovered) {
      return null
    }

    const hostCommissionAmount = Math.round(amount * (hostEntry.commissionRate / 100))
    const platformFeeAmount = amount - hostCommissionAmount

    if (platformFeeAmount < 0) {
      return null
    }

    const metadataOverlay: Metadata = {
      ...metadata,
      host_split_enabled: 'true',
      host_commission_rate: hostEntry.commissionRate.toFixed(2),
      host_commission_amount_cents: hostCommissionAmount.toString(),
      platform_fee_amount_cents: platformFeeAmount.toString(),
      host_stripe_account_id: hostEntry.stripeAccountId,
    }

    return {
      transfer_data: {
        destination: hostEntry.stripeAccountId,
      },
      application_fee_amount: platformFeeAmount,
      metadata: metadataOverlay,
    }
  } catch (error) {
    console.error('Error calculating host split config:', error)
    return null
  }
}

