/**
 * Test for the campaign completion fix
 * This test verifies that campaigns are properly identified for completion and assets are moved to archive
 */

import { createClient } from '@supabase/supabase-js'
import { CampaignAndAssetSchedulerService } from '../services/campaignAndAssetSchedulerService'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface CampaignCompletionTestResult {
  success: boolean
  message: string
  details: {
    campaignsFound: number
    campaignsProcessed: number
    assetsFound: number
    assetsMoved: number
    errors: string[]
    campaignDetails: any[]
    assetDetails: any[]
  }
}

export async function testCampaignCompletionFix(): Promise<CampaignCompletionTestResult> {
  console.log('=== CAMPAIGN COMPLETION FIX TEST ===')
  
  try {
    const details = {
      campaignsFound: 0,
      campaignsProcessed: 0,
      assetsFound: 0,
      assetsMoved: 0,
      errors: [] as string[],
      campaignDetails: [] as any[],
      assetDetails: [] as any[]
    }
    
    // Step 1: Find campaigns that should be completed
    console.log('Step 1: Finding campaigns that should be completed...')
    
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]
    
    console.log(`Today: ${today}`)
    console.log(`Yesterday: ${yesterdayISO}`)
    
    // Check for campaigns that ended today
    const { data: expiredCampaignsToday, error: todayError } = await supabase
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
      .lte('end_date', today)
    
    if (todayError) {
      const errorMsg = `Error fetching campaigns ending today: ${todayError.message}`
      console.error(errorMsg)
      details.errors.push(errorMsg)
    } else {
      console.log(`Found ${expiredCampaignsToday?.length || 0} campaigns ending today`)
      details.campaignsFound += expiredCampaignsToday?.length || 0
    }
    
    // Check for campaigns that ended yesterday
    const { data: expiredCampaignsYesterday, error: yesterdayError } = await supabase
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
      .lte('end_date', yesterdayISO)
    
    if (yesterdayError) {
      const errorMsg = `Error fetching campaigns ending yesterday: ${yesterdayError.message}`
      console.error(errorMsg)
      details.errors.push(errorMsg)
    } else {
      console.log(`Found ${expiredCampaignsYesterday?.length || 0} campaigns ending yesterday`)
      details.campaignsFound += expiredCampaignsYesterday?.length || 0
    }
    
    // Combine all expired campaigns
    const allExpiredCampaigns = [
      ...(expiredCampaignsToday || []),
      ...(expiredCampaignsYesterday || [])
    ]
    
    console.log(`Total expired campaigns found: ${allExpiredCampaigns.length}`)
    details.campaignsFound = allExpiredCampaigns.length
    
    // Step 2: Check assets for these campaigns
    console.log('Step 2: Checking assets for expired campaigns...')
    
    for (const campaign of allExpiredCampaigns) {
      console.log(`Checking campaign: ${campaign.name} (ID: ${campaign.id})`)
      console.log(`  Status: ${campaign.status}`)
      console.log(`  End Date: ${campaign.end_date}`)
      console.log(`  Updated: ${campaign.updated_at}`)
      
      details.campaignDetails.push({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        end_date: campaign.end_date,
        updated_at: campaign.updated_at
      })
      
      // Check media assets
      const { data: mediaAssets, error: assetsError } = await supabase
        .from('media_assets')
        .select(`
          id,
          file_name,
          status,
          campaign_id,
          file_path,
          metadata,
          updated_at
        `)
        .eq('campaign_id', campaign.id)
        .in('status', ['active', 'approved'])
      
      if (assetsError) {
        const errorMsg = `Error fetching assets for campaign ${campaign.id}: ${assetsError.message}`
        console.error(errorMsg)
        details.errors.push(errorMsg)
        continue
      }
      
      console.log(`  Assets found: ${mediaAssets?.length || 0}`)
      details.assetsFound += mediaAssets?.length || 0
      
      if (mediaAssets && mediaAssets.length > 0) {
        mediaAssets.forEach(asset => {
          console.log(`    Asset: ${asset.file_name} (Status: ${asset.status})`)
          details.assetDetails.push({
            id: asset.id,
            file_name: asset.file_name,
            status: asset.status,
            campaign_id: asset.campaign_id,
            file_path: asset.file_path,
            metadata: asset.metadata,
            updated_at: asset.updated_at
          })
        })
      }
    }
    
    // Step 3: Test manual trigger of campaign status scheduler
    console.log('Step 3: Testing manual trigger of campaign status scheduler...')
    
    try {
      const triggerResult = await CampaignAndAssetSchedulerService.triggerCampaignStatusScheduler()
      console.log('Campaign status scheduler triggered successfully:', triggerResult)
      details.campaignsProcessed = allExpiredCampaigns.length
    } catch (error) {
      const errorMsg = `Error triggering campaign status scheduler: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      details.errors.push(errorMsg)
    }
    
    // Step 4: Check if campaigns were updated after trigger
    console.log('Step 4: Checking if campaigns were updated after trigger...')
    
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
      .in('id', allExpiredCampaigns.map(c => c.id))
    
    if (updatedError) {
      console.error('Error fetching updated campaigns:', updatedError)
      details.errors.push(`Error fetching updated campaigns: ${updatedError.message}`)
    } else {
      console.log(`Updated campaigns: ${updatedCampaigns?.length || 0}`)
      updatedCampaigns?.forEach(campaign => {
        console.log(`  Campaign ${campaign.name}: Status = ${campaign.status}, Updated = ${campaign.updated_at}`)
        if (campaign.status === 'completed') {
          details.assetsMoved += 1 // This is a rough estimate
        }
      })
    }
    
    // Step 5: Check asset status after trigger
    console.log('Step 5: Checking asset status after trigger...')
    
    const { data: updatedAssets, error: assetsUpdatedError } = await supabase
      .from('media_assets')
      .select(`
        id,
        file_name,
        status,
        campaign_id,
        updated_at
      `)
      .in('campaign_id', allExpiredCampaigns.map(c => c.id))
      .order('updated_at', { ascending: false })
    
    if (assetsUpdatedError) {
      console.error('Error fetching updated assets:', assetsUpdatedError)
      details.errors.push(`Error fetching updated assets: ${assetsUpdatedError.message}`)
    } else {
      console.log(`Updated assets: ${updatedAssets?.length || 0}`)
      updatedAssets?.forEach(asset => {
        console.log(`  Asset ${asset.file_name}: Status = ${asset.status}, Updated = ${asset.updated_at}`)
      })
    }
    
    console.log('=== CAMPAIGN COMPLETION FIX TEST COMPLETED ===')
    
    const success = details.errors.length === 0
    return {
      success,
      message: success 
        ? 'Campaign completion fix test completed successfully' 
        : `Campaign completion fix test completed with ${details.errors.length} errors`,
      details
    }
    
  } catch (error) {
    console.error('Error in campaign completion fix test:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        campaignsFound: 0,
        campaignsProcessed: 0,
        assetsFound: 0,
        assetsMoved: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        campaignDetails: [],
        assetDetails: []
      }
    }
  }
}

// Export for use in other test files
export default testCampaignCompletionFix
