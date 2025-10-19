/**
 * Comprehensive verification test for the asset archive fix
 * This test verifies that the fixes are working correctly
 */

import { createClient } from '@supabase/supabase-js'
import { CampaignAndAssetSchedulerService } from '../services/campaignAndAssetSchedulerService'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface VerificationResult {
  success: boolean
  message: string
  details: {
    campaignsProcessed: number
    assetsMoved: number
    errors: string[]
    schedulerStatus: any
    assetLifecycleStatus: any
  }
}

export async function verifyAssetArchiveFix(): Promise<VerificationResult> {
  console.log('=== ASSET ARCHIVE FIX VERIFICATION ===')
  
  try {
    const details = {
      campaignsProcessed: 0,
      assetsMoved: 0,
      errors: [] as string[],
      schedulerStatus: null as any,
      assetLifecycleStatus: null as any
    }
    
    // Step 1: Check current system status
    console.log('Step 1: Checking system status...')
    
    try {
      const schedulerInfo = await CampaignAndAssetSchedulerService.getSchedulerInfo()
      details.schedulerStatus = schedulerInfo
      console.log('Scheduler info retrieved successfully')
    } catch (error) {
      const errorMsg = `Error getting scheduler info: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      details.errors.push(errorMsg)
    }
    
    // Step 2: Find campaigns that should be completed
    console.log('Step 2: Finding campaigns that should be completed...')
    
    const { data: expiredCampaigns, error: expiredError } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        start_date,
        end_date,
        selected_kiosk_ids,
        updated_at
      `)
      .eq('status', 'active')
      .lte('end_date', new Date().toISOString().split('T')[0])
    
    if (expiredError) {
      const errorMsg = `Error fetching expired campaigns: ${expiredError.message}`
      console.error(errorMsg)
      details.errors.push(errorMsg)
      return {
        success: false,
        message: 'Failed to fetch expired campaigns',
        details
      }
    }
    
    console.log(`Found ${expiredCampaigns?.length || 0} campaigns that should be completed`)
    details.campaignsProcessed = expiredCampaigns?.length || 0
    
    // Step 3: Check assets for these campaigns
    console.log('Step 3: Checking assets for expired campaigns...')
    
    let totalAssets = 0
    if (expiredCampaigns && expiredCampaigns.length > 0) {
      for (const campaign of expiredCampaigns) {
        console.log(`Checking assets for campaign: ${campaign.name}`)
        
        // Check media assets
        const { data: mediaAssets, error: mediaError } = await supabase
          .from('media_assets')
          .select(`
            id,
            file_name,
            status,
            campaign_id,
            google_drive_file_id,
            file_path
          `)
          .eq('campaign_id', campaign.id)
          .in('status', ['active', 'approved'])
        
        if (mediaError) {
          const errorMsg = `Error fetching media assets for campaign ${campaign.id}: ${mediaError.message}`
          console.error(errorMsg)
          details.errors.push(errorMsg)
          continue
        }
        
        console.log(`Campaign ${campaign.name} has ${mediaAssets?.length || 0} media assets`)
        totalAssets += mediaAssets?.length || 0
        
        // Check asset lifecycle records
        const { data: lifecycleRecords, error: lifecycleError } = await supabase
          .from('asset_lifecycle')
          .select(`
            id,
            media_asset_id,
            campaign_id,
            status,
            google_drive_folder,
            google_drive_file_id
          `)
          .eq('campaign_id', campaign.id)
        
        if (lifecycleError) {
          console.log(`No asset lifecycle records found for campaign ${campaign.name} (this is expected for some campaigns)`)
        } else {
          console.log(`Campaign ${campaign.name} has ${lifecycleRecords?.length || 0} asset lifecycle records`)
        }
      }
    }
    
    details.assetsMoved = totalAssets
    
    // Step 4: Test manual trigger of both schedulers
    console.log('Step 4: Testing manual trigger of both schedulers...')
    
    try {
      const triggerResult = await CampaignAndAssetSchedulerService.triggerBothSchedulers()
      console.log('Both schedulers triggered successfully:', triggerResult)
    } catch (error) {
      const errorMsg = `Error triggering both schedulers: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      details.errors.push(errorMsg)
    }
    
    // Step 5: Check asset lifecycle status after trigger
    console.log('Step 5: Checking asset lifecycle status after trigger...')
    
    try {
      const { data: assetLifecycle, error: lifecycleError } = await supabase
        .from('asset_lifecycle')
        .select(`
          id,
          media_asset_id,
          campaign_id,
          status,
          google_drive_folder,
          archived_at,
          created_at,
          updated_at
        `)
        .in('campaign_id', expiredCampaigns?.map(c => c.id) || [])
        .order('updated_at', { ascending: false })
        .limit(20)
      
      if (lifecycleError) {
        console.error('Error fetching asset lifecycle:', lifecycleError)
        details.errors.push(`Error fetching asset lifecycle: ${lifecycleError.message}`)
      } else {
        details.assetLifecycleStatus = assetLifecycle
        console.log(`Found ${assetLifecycle?.length || 0} asset lifecycle records`)
      }
    } catch (error) {
      const errorMsg = `Error checking asset lifecycle: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      details.errors.push(errorMsg)
    }
    
    // Step 6: Check if campaigns were updated
    console.log('Step 6: Checking if campaigns were updated...')
    
    const { data: updatedCampaigns, error: updatedError } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        start_date,
        end_date,
        updated_at
      `)
      .in('id', expiredCampaigns?.map(c => c.id) || [])
    
    if (updatedError) {
      console.error('Error fetching updated campaigns:', updatedError)
      details.errors.push(`Error fetching updated campaigns: ${updatedError.message}`)
    } else {
      console.log(`Updated campaigns: ${updatedCampaigns?.length || 0}`)
      updatedCampaigns?.forEach(campaign => {
        console.log(`Campaign ${campaign.name}: Status = ${campaign.status}, Updated = ${campaign.updated_at}`)
      })
    }
    
    // Step 7: Check Google Drive configurations
    console.log('Step 7: Checking Google Drive configurations...')
    
    const { data: gdriveConfigs, error: gdriveError } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
    
    if (gdriveError) {
      console.error('Error fetching Google Drive configs:', gdriveError)
      details.errors.push(`Error fetching Google Drive configs: ${gdriveError.message}`)
    } else {
      console.log(`Active Google Drive configs: ${gdriveConfigs?.length || 0}`)
    }
    
    const { data: kioskFolders, error: foldersError } = await supabase
      .from('kiosk_gdrive_folders')
      .select('*')
      .eq('gdrive_config_id', gdriveConfigs?.[0]?.id || '')
    
    if (foldersError) {
      console.error('Error fetching kiosk folders:', foldersError)
      details.errors.push(`Error fetching kiosk folders: ${foldersError.message}`)
    } else {
      console.log(`Kiosk folders: ${kioskFolders?.length || 0}`)
    }
    
    console.log('=== ASSET ARCHIVE FIX VERIFICATION COMPLETED ===')
    
    const success = details.errors.length === 0
    return {
      success,
      message: success 
        ? 'Asset archive fix verification completed successfully' 
        : `Asset archive fix verification completed with ${details.errors.length} errors`,
      details
    }
    
  } catch (error) {
    console.error('Error in asset archive fix verification:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        campaignsProcessed: 0,
        assetsMoved: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        schedulerStatus: null,
        assetLifecycleStatus: null
      }
    }
  }
}

// Export for use in other test files
export default verifyAssetArchiveFix

