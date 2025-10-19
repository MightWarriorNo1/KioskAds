/**
 * Manual test to trigger the campaign status scheduler and see what happens
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function manualSchedulerTest() {
  console.log('=== MANUAL SCHEDULER TEST ===')
  
  try {
    // 1. Check current state before trigger
    console.log('\n1. Checking current state...')
    
    const { data: campaignsBefore, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status, end_date, updated_at')
      .eq('status', 'active')
      .lte('end_date', new Date().toISOString().split('T')[0])
    
    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return
    }
    
    console.log(`Found ${campaignsBefore?.length || 0} active campaigns that should be completed`)
    campaignsBefore?.forEach(campaign => {
      console.log(`  - ${campaign.name}: End=${campaign.end_date}, Updated=${campaign.updated_at}`)
    })
    
    // 2. Trigger the campaign status scheduler manually
    console.log('\n2. Triggering campaign status scheduler...')
    
    const { data: triggerResult, error: triggerError } = await supabase.functions.invoke('campaign-status-scheduler', {
      body: { action: 'check_expired_campaigns' }
    })
    
    if (triggerError) {
      console.error('Error triggering scheduler:', triggerError)
      return
    }
    
    console.log('Scheduler triggered successfully:', triggerResult)
    
    // 3. Check state after trigger
    console.log('\n3. Checking state after trigger...')
    
    const { data: campaignsAfter, error: campaignsAfterError } = await supabase
      .from('campaigns')
      .select('id, name, status, end_date, updated_at')
      .in('id', campaignsBefore?.map(c => c.id) || [])
    
    if (campaignsAfterError) {
      console.error('Error fetching campaigns after trigger:', campaignsAfterError)
      return
    }
    
    console.log(`Campaigns after trigger: ${campaignsAfter?.length || 0}`)
    campaignsAfter?.forEach(campaign => {
      console.log(`  - ${campaign.name}: Status=${campaign.status}, Updated=${campaign.updated_at}`)
    })
    
    // 4. Check assets for completed campaigns
    console.log('\n4. Checking assets for completed campaigns...')
    
    const completedCampaigns = campaignsAfter?.filter(c => c.status === 'completed') || []
    console.log(`Completed campaigns: ${completedCampaigns.length}`)
    
    for (const campaign of completedCampaigns) {
      console.log(`\nCampaign: ${campaign.name} (ID: ${campaign.id})`)
      
      const { data: assets, error: assetsError } = await supabase
        .from('media_assets')
        .select('id, file_name, status, campaign_id, updated_at')
        .eq('campaign_id', campaign.id)
      
      if (assetsError) {
        console.error(`  Error fetching assets: ${assetsError.message}`)
      } else {
        console.log(`  Assets found: ${assets?.length || 0}`)
        assets?.forEach(asset => {
          console.log(`    - ${asset.file_name}: Status=${asset.status}, Updated=${asset.updated_at}`)
        })
      }
    }
    
    console.log('\n=== MANUAL SCHEDULER TEST COMPLETED ===')
    
  } catch (error) {
    console.error('Error in manual scheduler test:', error)
  }
}

export default manualSchedulerTest

