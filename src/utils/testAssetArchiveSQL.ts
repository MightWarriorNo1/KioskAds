/**
 * SQL-based tests for asset archiving
 * These queries help you verify the fix is working
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function testAssetArchiveWithSQL() {
  console.log('=== SQL-BASED ASSET ARCHIVE TEST ===')
  
  try {
    // Test 1: Find campaigns that should be completed
    console.log('Test 1: Finding campaigns that should be completed...')
    
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]
    
    console.log(`Today: ${today}`)
    console.log(`Yesterday: ${yesterdayISO}`)
    
    // Query for campaigns ending today
    const { data: campaignsToday, error: todayError } = await supabase
      .from('campaigns')
      .select('id, name, status, end_date, updated_at')
      .eq('status', 'active')
      .lte('end_date', today)
    
    if (todayError) {
      console.error('Error fetching campaigns ending today:', todayError)
    } else {
      console.log(`Campaigns ending today: ${campaignsToday?.length || 0}`)
      campaignsToday?.forEach(campaign => {
        console.log(`  - ${campaign.name} (${campaign.id}): End ${campaign.end_date}, Status ${campaign.status}`)
      })
    }
    
    // Query for campaigns ending yesterday
    const { data: campaignsYesterday, error: yesterdayError } = await supabase
      .from('campaigns')
      .select('id, name, status, end_date, updated_at')
      .eq('status', 'active')
      .lte('end_date', yesterdayISO)
    
    if (yesterdayError) {
      console.error('Error fetching campaigns ending yesterday:', yesterdayError)
    } else {
      console.log(`Campaigns ending yesterday: ${campaignsYesterday?.length || 0}`)
      campaignsYesterday?.forEach(campaign => {
        console.log(`  - ${campaign.name} (${campaign.id}): End ${campaign.end_date}, Status ${campaign.status}`)
      })
    }
    
    // Test 2: Check assets for these campaigns
    console.log('\nTest 2: Checking assets for campaigns...')
    
    const allCampaigns = [...(campaignsToday || []), ...(campaignsYesterday || [])]
    
    for (const campaign of allCampaigns) {
      console.log(`\nCampaign: ${campaign.name}`)
      
      // Check media assets
      const { data: mediaAssets, error: assetsError } = await supabase
        .from('media_assets')
        .select('id, file_name, status, file_path, metadata, updated_at')
        .eq('campaign_id', campaign.id)
        .in('status', ['active', 'approved'])
      
      if (assetsError) {
        console.error(`  Error fetching assets: ${assetsError.message}`)
      } else {
        console.log(`  Assets found: ${mediaAssets?.length || 0}`)
        mediaAssets?.forEach(asset => {
          console.log(`    - ${asset.file_name}: Status ${asset.status}, Updated ${asset.updated_at}`)
        })
      }
      
      // Check asset lifecycle records
      const { data: lifecycleRecords, error: lifecycleError } = await supabase
        .from('asset_lifecycle')
        .select('id, status, google_drive_folder, archived_at, updated_at')
        .eq('campaign_id', campaign.id)
      
      if (lifecycleError) {
        console.log(`  No asset lifecycle records found (this is normal for some campaigns)`)
      } else {
        console.log(`  Asset lifecycle records: ${lifecycleRecords?.length || 0}`)
        lifecycleRecords?.forEach(record => {
          console.log(`    - Status: ${record.status}, Folder: ${record.google_drive_folder}, Archived: ${record.archived_at}`)
        })
      }
    }
    
    // Test 3: Check Google Drive configurations
    console.log('\nTest 3: Checking Google Drive configurations...')
    
    const { data: gdriveConfigs, error: gdriveError } = await supabase
      .from('google_drive_configs')
      .select('id, name, is_active')
      .eq('is_active', true)
    
    if (gdriveError) {
      console.error('Error fetching Google Drive configs:', gdriveError)
    } else {
      console.log(`Active Google Drive configs: ${gdriveConfigs?.length || 0}`)
      gdriveConfigs?.forEach(config => {
        console.log(`  - ${config.name} (${config.id})`)
      })
    }
    
    // Test 4: Check kiosk folder mappings
    console.log('\nTest 4: Checking kiosk folder mappings...')
    
    const { data: kioskFolders, error: foldersError } = await supabase
      .from('kiosk_gdrive_folders')
      .select('kiosk_id, active_folder_id, archive_folder_id')
      .eq('gdrive_config_id', gdriveConfigs?.[0]?.id || '')
    
    if (foldersError) {
      console.error('Error fetching kiosk folders:', foldersError)
    } else {
      console.log(`Kiosk folder mappings: ${kioskFolders?.length || 0}`)
      kioskFolders?.forEach(folder => {
        console.log(`  - Kiosk ${folder.kiosk_id}: Active ${folder.active_folder_id}, Archive ${folder.archive_folder_id}`)
      })
    }
    
    console.log('\n=== SQL-BASED ASSET ARCHIVE TEST COMPLETED ===')
    
    return {
      success: true,
      message: 'SQL-based test completed successfully',
      details: {
        campaignsToday: campaignsToday?.length || 0,
        campaignsYesterday: campaignsYesterday?.length || 0,
        totalCampaigns: allCampaigns.length,
        gdriveConfigs: gdriveConfigs?.length || 0,
        kioskFolders: kioskFolders?.length || 0
      }
    }
    
  } catch (error) {
    console.error('Error in SQL-based test:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {}
    }
  }
}

// Export for use in other test files
export default testAssetArchiveWithSQL
