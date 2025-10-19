/**
 * Test database access to check for RLS issues
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function testDatabaseAccess() {
  console.log('=== DATABASE ACCESS TEST ===')
  
  try {
    // 1. Test basic media assets access
    console.log('\n1. Testing basic media assets access...')
    
    const { data: allAssets, error: allError } = await supabase
      .from('media_assets')
      .select('id, file_name, status, campaign_id')
      .limit(5)
    
    if (allError) {
      console.error('Error fetching all assets:', allError)
    } else {
      console.log(`Found ${allAssets?.length || 0} total assets`)
      allAssets?.forEach(asset => {
        console.log(`  - ${asset.file_name}: Status=${asset.status}, Campaign=${asset.campaign_id}`)
      })
    }
    
    // 2. Test specific campaign access
    console.log('\n2. Testing specific campaign access...')
    
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('status', 'completed')
      .limit(3)
    
    if (campaignError) {
      console.error('Error fetching completed campaigns:', campaignError)
    } else {
      console.log(`Found ${campaigns?.length || 0} completed campaigns`)
      
      for (const campaign of campaigns || []) {
        console.log(`\nCampaign: ${campaign.name} (ID: ${campaign.id})`)
        
        // Test different status queries
        const statuses = ['active', 'approved', 'archived']
        
        for (const status of statuses) {
          const { data: assets, error: assetsError } = await supabase
            .from('media_assets')
            .select('id, file_name, status')
            .eq('campaign_id', campaign.id)
            .eq('status', status)
          
          if (assetsError) {
            console.error(`  Error fetching assets with status ${status}:`, assetsError)
          } else {
            console.log(`  Status ${status}: Found ${assets?.length || 0} assets`)
            assets?.forEach(asset => {
              console.log(`    - ${asset.file_name} (ID: ${asset.id})`)
            })
          }
        }
        
        // Test combined status query
        const { data: combinedAssets, error: combinedError } = await supabase
          .from('media_assets')
          .select('id, file_name, status')
          .eq('campaign_id', campaign.id)
          .in('status', ['active', 'approved', 'archived'])
        
        if (combinedError) {
          console.error(`  Error fetching combined status assets:`, combinedError)
        } else {
          console.log(`  Combined status query: Found ${combinedAssets?.length || 0} assets`)
          combinedAssets?.forEach(asset => {
            console.log(`    - ${asset.file_name} (Status: ${asset.status})`)
          })
        }
      }
    }
    
    // 3. Test RLS policies
    console.log('\n3. Testing RLS policies...')
    
    const { data: rlsTest, error: rlsError } = await supabase
      .from('media_assets')
      .select('id, file_name, status')
      .eq('status', 'archived')
      .limit(10)
    
    if (rlsError) {
      console.error('Error fetching archived assets (RLS test):', rlsError)
      console.log('This might indicate RLS policy restrictions')
    } else {
      console.log(`RLS test passed: Found ${rlsTest?.length || 0} archived assets`)
      rlsTest?.forEach(asset => {
        console.log(`  - ${asset.file_name} (ID: ${asset.id})`)
      })
    }
    
    console.log('\n=== DATABASE ACCESS TEST COMPLETED ===')
    
  } catch (error) {
    console.error('Error in database access test:', error)
  }
}

export default testDatabaseAccess

