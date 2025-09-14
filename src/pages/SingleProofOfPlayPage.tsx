import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/layouts/DashboardLayout'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { ProofOfPlayService } from '../services/proofOfPlayService'

export default function SingleProofOfPlayPage() {
  const { campaignId, assetId } = useParams()
  const [qs] = useSearchParams()
  const kioskId = qs.get('kioskId') ?? undefined
  const { user } = useAuth()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [lastSync, setLastSync] = useState<string>('')

  useEffect(() => {
    // Resolve org via users_orgs (first membership)
    const fetchOrg = async () => {
      try {
        const { data, error } = await (window as any).supabase
          .from('users_orgs')
          .select('org_id')
          .limit(1)
          .maybeSingle()
        if (!error && data?.org_id) setOrgId(data.org_id)
      } catch {}
    }
    fetchOrg()
  }, [user?.id])

  useEffect(() => {
    const run = async () => {
      if (!orgId || !assetId) return
      setLoading(true)
      try {
        const c = await ProofOfPlayService.getShowsCount({ orgId, assetId, campaignId, kioskId, period: tab })
        setCount(c)
        setLastSync(new Date().toISOString())
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [orgId, assetId, campaignId, kioskId, tab])

  const title = 'Client Campaign — Proof of Play (Shows)'
  const label = tab === 'daily' ? 'Today' : tab === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'

  return (
    <DashboardLayout title={title} subtitle="">
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-b from-[#0B2B5E] to-[#091A3A] rounded-xl p-8">
        <div className="flex space-x-2 mb-6">
          <Button variant={tab==='daily'?'primary':'outline'} onClick={() => setTab('daily')}>Daily</Button>
          <Button variant={tab==='weekly'?'primary':'outline'} onClick={() => setTab('weekly')}>Weekly</Button>
          <Button variant={tab==='monthly'?'primary':'outline'} onClick={() => setTab('monthly')}>Monthly</Button>
        </div>
        <Card className="bg-transparent border-0">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="42" stroke="#1E3A8A" strokeWidth="8" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="#FFD32E" strokeWidth="8" fill="none" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-white text-5xl font-bold">{loading ? '—' : count.toLocaleString()}</div>
              <div className="text-white/80 mt-1">{label}</div>
            </div>
          </div>
        </Card>
        <div className="text-white/60 mt-6 text-sm">Last sync: {lastSync ? new Date(lastSync).toLocaleString() : '—'}</div>
      </div>
    </DashboardLayout>
  )
}


