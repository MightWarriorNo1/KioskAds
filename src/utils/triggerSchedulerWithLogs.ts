/**
 * Trigger the campaign status scheduler and capture detailed logs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function triggerSchedulerWithLogs() {
  console.log('=== TRIGGERING SCHEDULER WITH DETAILED LOGS ===')
  
  try {
    // 1. Check current state
    console.log('\n1. Current state before trigger:')
    
    const { data: activeCampaigns, error: activeError } = await supabase
      .from('campaigns')
      .select('id, name, status, end_date, updated_at')
      .eq('status', 'active')
      .lte('end_date', new Date().toISOString().split('T')[0])
    
    if (activeError) {
      console.error('Error fetching active campaigns:', activeError)
      return
    }
    
    console.log(`Found ${activeCampaigns?.length || 0} active campaigns that should be completed:`)
    activeCampaigns?.forEach(campaign => {
      console.log(`  - ${campaign.name}: End=${campaign.end_date}, Updated=${campaign.updated_at}`)
    })
    
    // 2. Trigger the scheduler
    console.log('\n2. Triggering campaign status scheduler...')
    console.log('This will show detailed logs from the edge function...')
    
    const { data: result, error: triggerError } = await supabase.functions.invoke('campaign-status-scheduler', {
      body: { action: 'check_expired_campaigns' }
    })
    
    if (triggerError) {
      console.error('Error triggering scheduler:', triggerError)
      return
    }
    
    console.log('Scheduler result:', result)
    
    // 3. Check state after trigger
    console.log('\n3. State after trigger:')
    
    const { data: updatedCampaigns, error: updatedError } = await supabase
      .from('campaigns')
      .select('id, name, status, end_date, updated_at')
      .in('id', activeCampaigns?.map(c => c.id) || [])
    
    if (updatedError) {
      console.error('Error fetching updated campaigns:', updatedError)
    } else {
      console.log(`Updated campaigns: ${updatedCampaigns?.length || 0}`)
      updatedCampaigns?.forEach(campaign => {
        console.log(`  - ${campaign.name}: Status=${campaign.status}, Updated=${campaign.updated_at}`)
      })
    }
    
    // 4. Check assets for completed campaigns
    console.log('\n4. Checking assets for completed campaigns:')
    
    const completedCampaigns = updatedCampaigns?.filter(c => c.status === 'completed') || []
    console.log(`Completed campaigns: ${completedCampaigns.length}`)
    
    for (const campaign of completedCampaigns) {
      console.log(`\nCampaign: ${campaign.name} (ID: ${campaign.id})`)
      
      const { data: assets, error: assetsError } = await supabase
        .from('media_assets')
        .select('id, file_name, status, campaign_id, metadata, updated_at')
        .eq('campaign_id', campaign.id)
      
      if (assetsError) {
        console.error(`  Error fetching assets: ${assetsError.message}`)
      } else {
        console.log(`  Assets found: ${assets?.length || 0}`)
        assets?.forEach(asset => {
          console.log(`    - ${asset.file_name}: Status=${asset.status}, Updated=${asset.updated_at}`)
          console.log(`      Metadata: ${JSON.stringify(asset.metadata)}`)
        })
      }
    }
    
    console.log('\n=== SCHEDULER TRIGGER WITH LOGS COMPLETED ===')
    console.log('\n📝 NOTE: Check the Supabase Edge Function logs for detailed Google Drive API calls')
    console.log('   Go to: Supabase Dashboard > Edge Functions > campaign-status-scheduler > Logs')
    
  } catch (error) {
    console.error('Error in scheduler trigger with logs:', error)
  }
}

export default triggerSchedulerWithLogs

