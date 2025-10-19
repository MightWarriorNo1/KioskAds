/**
 * Debug script to check why assets are not archiving
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function debugAssetArchive() {
  console.log('=== ASSET ARCHIVE DEBUG ===')
  
  try {
    // 1. Check current campaign statuses
    console.log('\n1. Checking campaign statuses...')
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status, start_date, end_date, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10)
    
    if (campaignError) {
      console.error('Error fetching campaigns:', campaignError)
      return
    }
    
    console.log(`Found ${campaigns?.length || 0} campaigns:`)
    campaigns?.forEach(campaign => {
      console.log(`  - ${campaign.name}: Status=${campaign.status}, End=${campaign.end_date}, Updated=${campaign.updated_at}`)
    })
    
    // 2. Check for active campaigns that should be completed
    console.log('\n2. Checking for campaigns that should be completed...')
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]
    
    console.log(`Today: ${today}`)
    console.log(`Yesterday: ${yesterdayISO}`)
    
    const { data: expiredCampaigns, error: expiredError } = await supabase
      .from('campaigns')
      .select('id, name, status, end_date, updated_at')
      .eq('status', 'active')
      .lte('end_date', today)
    
    if (expiredError) {
      console.error('Error fetching expired campaigns:', expiredError)
    } else {
      console.log(`Found ${expiredCampaigns?.length || 0} active campaigns that should be completed`)
      expiredCampaigns?.forEach(campaign => {
        console.log(`  - ${campaign.name}: End=${campaign.end_date}, Updated=${campaign.updated_at}`)
      })
    }
    
    // 3. Check assets for these campaigns
    if (expiredCampaigns && expiredCampaigns.length > 0) {
      console.log('\n3. Checking assets for expired campaigns...')
      
      for (const campaign of expiredCampaigns) {
        console.log(`\nCampaign: ${campaign.name} (ID: ${campaign.id})`)
        
        const { data: assets, error: assetsError } = await supabase
          .from('media_assets')
          .select('id, file_name, status, campaign_id, metadata, updated_at')
          .eq('campaign_id', campaign.id)
          .in('status', ['active', 'approved'])
        
        if (assetsError) {
          console.error(`  Error fetching assets: ${assetsError.message}`)
        } else {
          console.log(`  Assets found: ${assets?.length || 0}`)
          assets?.forEach(asset => {
            console.log(`    - ${asset.file_name}: Status=${asset.status}, Updated=${asset.updated_at}`)
            if (asset.metadata) {
              console.log(`      Metadata: ${JSON.stringify(asset.metadata)}`)
            }
          })
        }
      }
    }
    
    // 4. Check cron job status
    console.log('\n4. Checking cron job status...')
    const { data: cronJobs, error: cronError } = await supabase
      .from('pg_cron.job')
      .select('*')
    
    if (cronError) {
      console.error('Error fetching cron jobs:', cronError)
    } else {
      console.log(`Found ${cronJobs?.length || 0} cron jobs`)
      cronJobs?.forEach(job => {
        console.log(`  - ${job.jobname}: Active=${job.active}, Schedule=${job.schedule}`)
      })
    }
    
    // 5. Check system settings
    console.log('\n5. Checking system settings...')
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'scheduler_config')
    
    if (settingsError) {
      console.error('Error fetching system settings:', settingsError)
    } else {
      console.log(`System settings found: ${settings?.length || 0}`)
      settings?.forEach(setting => {
        console.log(`  - ${setting.key}: ${setting.value}`)
      })
    }
    
    // 6. Check recent scheduler runs
    console.log('\n6. Checking recent scheduler runs...')
    const { data: runs, error: runsError } = await supabase
      .from('scheduler_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (runsError) {
      console.error('Error fetching scheduler runs:', runsError)
    } else {
      console.log(`Recent scheduler runs: ${runs?.length || 0}`)
      runs?.forEach(run => {
        console.log(`  - ${run.scheduler_type}: Status=${run.status}, Created=${run.created_at}`)
        if (run.error_message) {
          console.log(`    Error: ${run.error_message}`)
        }
      })
    }
    
    console.log('\n=== DEBUG COMPLETED ===')
    
  } catch (error) {
    console.error('Error in debug:', error)
  }
}

// Export for use in components
export default debugAssetArchive

