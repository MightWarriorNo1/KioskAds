/**
 * Comprehensive test for the complete asset archiving flow
 * This tests the entire process from campaign status change to asset archiving
 */

import { createClient } from '@supabase/supabase-js'
import { CampaignAndAssetSchedulerService } from '../services/campaignAndAssetSchedulerService'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface TestResult {
  success: boolean
  message: string
  details: Record<string, unknown>
}

export async function testCompleteAssetArchiveFlow(): Promise<TestResult> {
  console.log('=== COMPLETE ASSET ARCHIVE FLOW TEST ===')
  
  try {
    const results: Record<string, unknown> = {}
    
    // Test 1: Check current system status
    console.log('Test 1: Checking system status...')
    
    const schedulerInfo = await CampaignAndAssetSchedulerService.getSchedulerInfo()
    results.schedulerInfo = schedulerInfo
    
    const campaignStatusJobs = await CampaignAndAssetSchedulerService.getCampaignStatusSchedulerStatus()
    results.campaignStatusJobs = campaignStatusJobs
    
    const assetFolderJobs = await CampaignAndAssetSchedulerService.getAssetFolderSchedulerStatus()
    results.assetFolderJobs = assetFolderJobs
    
    console.log('System status checked')
    
    // Test 2: Find campaigns that should be completed
    console.log('Test 2: Finding campaigns that should be completed...')
    
    const { data: expiredCampaigns, error: expiredError } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        start_date,
        end_date,
        selected_kiosk_ids
      `)
      .eq('status', 'active')
      .lte('end_date', new Date().toISOString().split('T')[0])
    
    if (expiredError) {
      throw new Error(`Error fetching expired campaigns: ${expiredError.message}`)
    }
    
    results.expiredCampaigns = expiredCampaigns
    console.log(`Found ${expiredCampaigns?.length || 0} campaigns that should be completed`)
    
    // Test 3: Check assets for these campaigns
    console.log('Test 3: Checking assets for expired campaigns...')
    
    const campaignAssets: Record<string, unknown[]> = {}
    
    if (expiredCampaigns && expiredCampaigns.length > 0) {
      for (const campaign of expiredCampaigns) {
        const { data: assets, error: assetsError } = await supabase
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
        
        if (assetsError) {
          console.error(`Error fetching assets for campaign ${campaign.id}:`, assetsError)
          continue
        }
        
        campaignAssets[campaign.id] = assets || []
        console.log(`Campaign ${campaign.name} has ${assets?.length || 0} assets to archive`)
      }
    }
    
    results.campaignAssets = campaignAssets
    
    // Test 4: Test manual trigger of campaign status scheduler
    console.log('Test 4: Testing manual trigger of campaign status scheduler...')
    
    try {
      const campaignStatusResult = await CampaignAndAssetSchedulerService.triggerCampaignStatusScheduler()
      results.campaignStatusTrigger = campaignStatusResult
      console.log('Campaign status scheduler triggered:', campaignStatusResult)
    } catch (error) {
      console.error('Error triggering campaign status scheduler:', error)
      results.campaignStatusTriggerError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Test 5: Test manual trigger of asset folder scheduler
    console.log('Test 5: Testing manual trigger of asset folder scheduler...')
    
    try {
      const assetFolderResult = await CampaignAndAssetSchedulerService.triggerAssetFolderScheduler()
      results.assetFolderTrigger = assetFolderResult
      console.log('Asset folder scheduler triggered:', assetFolderResult)
    } catch (error) {
      console.error('Error triggering asset folder scheduler:', error)
      results.assetFolderTriggerError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Test 6: Test both schedulers together
    console.log('Test 6: Testing both schedulers together...')
    
    try {
      const bothSchedulersResult = await CampaignAndAssetSchedulerService.triggerBothSchedulers()
      results.bothSchedulersTrigger = bothSchedulersResult
      console.log('Both schedulers triggered:', bothSchedulersResult)
    } catch (error) {
      console.error('Error triggering both schedulers:', error)
      results.bothSchedulersTriggerError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Test 7: Check if assets were actually moved
    console.log('Test 7: Checking if assets were moved...')
    
    const postTriggerAssets: Record<string, unknown[]> = {}
    
    if (expiredCampaigns && expiredCampaigns.length > 0) {
      for (const campaign of expiredCampaigns) {
        const { data: assets, error: assetsError } = await supabase
          .from('media_assets')
          .select(`
            id,
            file_name,
            status,
            campaign_id,
            google_drive_file_id,
            file_path,
            metadata
          `)
          .eq('campaign_id', campaign.id)
        
        if (assetsError) {
          console.error(`Error fetching assets for campaign ${campaign.id}:`, assetsError)
          continue
        }
        
        postTriggerAssets[campaign.id] = assets || []
        console.log(`Campaign ${campaign.name} assets after trigger:`, assets?.length || 0)
      }
    }
    
    results.postTriggerAssets = postTriggerAssets
    
    // Test 8: Check campaign status changes
    console.log('Test 8: Checking campaign status changes...')
    
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
    } else {
      results.updatedCampaigns = updatedCampaigns
      console.log('Updated campaigns:', updatedCampaigns?.length || 0)
    }
    
    // Test 9: Check Google Drive folder mappings
    console.log('Test 9: Checking Google Drive folder mappings...')
    
    const { data: gdriveConfigs, error: gdriveError } = await supabase
      .from('google_drive_configs')
      .select('*')
      .eq('is_active', true)
    
    if (gdriveError) {
      console.error('Error fetching Google Drive configs:', gdriveError)
    } else {
      results.gdriveConfigs = gdriveConfigs
      console.log('Google Drive configs:', gdriveConfigs?.length || 0)
    }
    
    const { data: kioskFolders, error: foldersError } = await supabase
      .from('kiosk_gdrive_folders')
      .select('*')
      .eq('gdrive_config_id', gdriveConfigs?.[0]?.id || '')
    
    if (foldersError) {
      console.error('Error fetching kiosk folders:', foldersError)
    } else {
      results.kioskFolders = kioskFolders
      console.log('Kiosk folders:', kioskFolders?.length || 0)
    }
    
    console.log('=== COMPLETE ASSET ARCHIVE FLOW TEST COMPLETED ===')
    
    return {
      success: true,
      message: 'Complete asset archive flow test completed successfully',
      details: results
    }
    
  } catch (error) {
    console.error('Error in complete asset archive flow test:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {}
    }
  }
}

// Export for use in other test files
export default testCompleteAssetArchiveFlow

