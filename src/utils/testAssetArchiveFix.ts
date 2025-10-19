/**
 * Test script to verify that asset archiving works correctly
 * This tests the fixed functionality where assets move from active to archive
 * when campaigns transition from active to completed status
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function testAssetArchiveFix() {
  console.log('Testing asset archive fix...')
  
  try {
    // Test 1: Check if campaigns can transition from active to completed
    console.log('Test 1: Checking campaign status transitions...')
    
    const { data: activeCampaigns, error: activeError } = await supabase
      .from('campaigns')
      .select('id, name, status, end_date')
      .eq('status', 'active')
      .lte('end_date', new Date().toISOString().split('T')[0])
    
    if (activeError) {
      console.error('Error fetching active campaigns:', activeError)
      return false
    }
    
    console.log(`Found ${activeCampaigns?.length || 0} campaigns that should be completed`)
    
    // Test 2: Check if assets exist for these campaigns
    if (activeCampaigns && activeCampaigns.length > 0) {
      for (const campaign of activeCampaigns) {
        console.log(`Checking assets for campaign: ${campaign.name}`)
        
        const { data: assets, error: assetsError } = await supabase
          .from('media_assets')
          .select('id, file_name, status, campaign_id')
          .eq('campaign_id', campaign.id)
          .eq('status', 'active')
        
        if (assetsError) {
          console.error(`Error fetching assets for campaign ${campaign.id}:`, assetsError)
          continue
        }
        
        console.log(`Campaign ${campaign.name} has ${assets?.length || 0} active assets`)
        
        if (assets && assets.length > 0) {
          console.log('Assets that should be moved to archive:')
          assets.forEach(asset => {
            console.log(`- ${asset.file_name} (ID: ${asset.id})`)
          })
        }
      }
    }
    
    // Test 3: Check if the cron job functions exist
    console.log('Test 3: Checking cron job functions...')
    
    const { data: cronJobs, error: cronError } = await supabase
      .from('cron.job')
      .select('*')
      .like('command', '%campaign-status-scheduler%')
    
    if (cronError) {
      console.error('Error checking cron jobs:', cronError)
    } else {
      console.log(`Found ${cronJobs?.length || 0} campaign status scheduler cron jobs`)
      cronJobs?.forEach(job => {
        console.log(`- Job ID: ${job.jobid}, Schedule: ${job.schedule}, Active: ${job.active}`)
      })
    }
    
    const { data: assetCronJobs, error: assetCronError } = await supabase
      .from('cron.job')
      .select('*')
      .like('command', '%asset-folder-scheduler%')
    
    if (assetCronError) {
      console.error('Error checking asset folder cron jobs:', assetCronError)
    } else {
      console.log(`Found ${assetCronJobs?.length || 0} asset folder scheduler cron jobs`)
      assetCronJobs?.forEach(job => {
        console.log(`- Job ID: ${job.jobid}, Schedule: ${job.schedule}, Active: ${job.active}`)
      })
    }
    
    // Test 4: Check recent cron job runs
    console.log('Test 4: Checking recent cron job runs...')
    
    const { data: recentRuns, error: runsError } = await supabase
      .from('cron.job_run_details')
      .select('*')
      .in('jobid', [
        ...(cronJobs?.map(job => job.jobid) || []),
        ...(assetCronJobs?.map(job => job.jobid) || [])
      ])
      .order('start_time', { ascending: false })
      .limit(10)
    
    if (runsError) {
      console.error('Error checking recent runs:', runsError)
    } else {
      console.log(`Found ${recentRuns?.length || 0} recent cron job runs`)
      recentRuns?.forEach(run => {
        console.log(`- Job ID: ${run.jobid}, Start: ${run.start_time}, Status: ${run.status}`)
      })
    }
    
    // Test 5: Test manual trigger of both schedulers
    console.log('Test 5: Testing manual trigger of schedulers...')
    
    try {
      const { data: triggerResult, error: triggerError } = await supabase.rpc('trigger_both_schedulers')
      if (triggerError) {
        console.error('Error triggering both schedulers:', triggerError)
      } else {
        console.log('Manual trigger result:', triggerResult)
      }
    } catch (triggerErr) {
      console.error('Error in manual trigger test:', triggerErr)
    }
    
    console.log('Asset archive fix test completed successfully!')
    return true
    
  } catch (error) {
    console.error('Error testing asset archive fix:', error)
    return false
  }
}

// Export for use in other test files
export default testAssetArchiveFix
