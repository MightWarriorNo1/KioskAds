/**
 * Test Google Drive file movement specifically
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function testGoogleDriveMovement() {
  console.log('=== GOOGLE DRIVE MOVEMENT TEST ===')
  
  try {
    // 1. Find a completed campaign with assets
    console.log('\n1. Finding completed campaign with assets...')
    
    const { data: completedCampaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status, selected_kiosk_ids')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(1)
    
    if (campaignError) {
      console.error('Error fetching completed campaigns:', campaignError)
      return
    }
    
    if (!completedCampaigns || completedCampaigns.length === 0) {
      console.log('No completed campaigns found')
      return
    }
    
    const campaign = completedCampaigns[0]
    console.log(`Found campaign: ${campaign.name} (ID: ${campaign.id})`)
    console.log(`Kiosk IDs: ${JSON.stringify(campaign.selected_kiosk_ids)}`)
    
    // 2. Get assets for this campaign
    console.log('\n2. Getting assets for this campaign...')
    
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('id, file_name, status, campaign_id, metadata, file_path')
      .eq('campaign_id', campaign.id)
    
    if (assetsError) {
      console.error('Error fetching assets:', assetsError)
      return
    }
    
    console.log(`Found ${assets?.length || 0} assets:`)
    assets?.forEach(asset => {
      console.log(`  - ${asset.file_name}: Status=${asset.status}`)
      console.log(`    Metadata: ${JSON.stringify(asset.metadata)}`)
      console.log(`    File Path: ${asset.file_path}`)
    })
    
    // 3. Check Google Drive configuration
    console.log('\n3. Checking Google Drive configuration...')
    
    const { data: gdriveConfig, error: configError } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (configError) {
      console.error('Error fetching Google Drive config:', configError)
      return
    }
    
    if (!gdriveConfig) {
      console.log('No active Google Drive configuration found')
      return
    }
    
    console.log(`Google Drive config found: ${gdriveConfig.id}`)
    console.log(`Client ID: ${gdriveConfig.client_id}`)
    console.log(`Has refresh token: ${!!gdriveConfig.refresh_token}`)
    
    // 4. Check kiosk folder mappings
    console.log('\n4. Checking kiosk folder mappings...')
    
    const kioskIds = campaign.selected_kiosk_ids || []
    for (const kioskId of kioskIds) {
      console.log(`\nChecking kiosk ${kioskId}:`)
      
      const { data: folderMapping, error: folderError } = await supabase
        .from('kiosk_gdrive_folders')
        .select('*')
        .eq('kiosk_id', kioskId)
        .eq('gdrive_config_id', gdriveConfig.id)
        .maybeSingle()
      
      if (folderError) {
        console.error(`  Error fetching folder mapping: ${folderError.message}`)
      } else if (!folderMapping) {
        console.log(`  No folder mapping found for kiosk ${kioskId}`)
      } else {
        console.log(`  Active folder ID: ${folderMapping.active_folder_id}`)
        console.log(`  Archive folder ID: ${folderMapping.archive_folder_id}`)
      }
    }
    
    // 5. Check upload jobs for Google Drive file IDs
    console.log('\n5. Checking upload jobs for Google Drive file IDs...')
    
    for (const asset of assets || []) {
      console.log(`\nAsset: ${asset.file_name} (ID: ${asset.id})`)
      
      const { data: uploadJobs, error: uploadError } = await supabase
        .from('upload_jobs')
        .select('gdrive_file_id, status, created_at')
        .eq('media_asset_id', asset.id)
        .order('created_at', { ascending: false })
      
      if (uploadError) {
        console.error(`  Error fetching upload jobs: ${uploadError.message}`)
      } else if (!uploadJobs || uploadJobs.length === 0) {
        console.log(`  No upload jobs found for asset ${asset.id}`)
      } else {
        console.log(`  Upload jobs found: ${uploadJobs.length}`)
        uploadJobs.forEach(job => {
          console.log(`    - File ID: ${job.gdrive_file_id}, Status: ${job.status}, Created: ${job.created_at}`)
        })
      }
    }
    
    // 6. Test Google Drive API access
    console.log('\n6. Testing Google Drive API access...')
    
    try {
      // Test getting access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: gdriveConfig.client_id,
          client_secret: gdriveConfig.client_secret,
          refresh_token: gdriveConfig.refresh_token,
          grant_type: 'refresh_token'
        })
      })
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error(`Failed to get access token: ${tokenResponse.status} ${errorText}`)
        return
      }
      
      const tokenData = await tokenResponse.json()
      console.log(`Access token obtained successfully: ${tokenData.access_token.substring(0, 20)}...`)
      
      // Test Google Drive API call
      const testResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      })
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text()
        console.error(`Google Drive API test failed: ${testResponse.status} ${errorText}`)
        return
      }
      
      const testData = await testResponse.json()
      console.log(`Google Drive API access successful: ${testData.user.displayName}`)
      
    } catch (apiError) {
      console.error('Error testing Google Drive API:', apiError)
    }
    
    console.log('\n=== GOOGLE DRIVE MOVEMENT TEST COMPLETED ===')
    
  } catch (error) {
    console.error('Error in Google Drive movement test:', error)
  }
}

export default testGoogleDriveMovement

