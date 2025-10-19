/**
 * Asset Archive Tester Component
 * Simple interface to test the asset archiving functionality
 */

import React, { useState } from 'react'
import { CampaignAndAssetSchedulerService } from '../../services/campaignAndAssetSchedulerService'
import { testCampaignCompletionFix } from '../../utils/testCampaignCompletionFix'
import { debugAssetArchive } from '../../utils/debugAssetArchive'
import { manualSchedulerTest } from '../../utils/manualSchedulerTest'
import { checkCronStatus } from '../../utils/checkCronStatus'
import { testGoogleDriveMovement } from '../../utils/testGoogleDriveMovement'
import { triggerSchedulerWithLogs } from '../../utils/triggerSchedulerWithLogs'
import { testDatabaseAccess } from '../../utils/testDatabaseAccess'

interface AssetArchiveTesterProps {
  standalone?: boolean;
}

export default function AssetArchiveTester({ standalone = false }: AssetArchiveTesterProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleTestCampaignCompletion = async () => {
    setIsLoading(true)
    try {
      const result = await testCampaignCompletionFix()
      setResults(result)
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTriggerSchedulers = async () => {
    setIsLoading(true)
    try {
      const result = await CampaignAndAssetSchedulerService.triggerBothSchedulers()
      setResults({
        success: true,
        message: 'Schedulers triggered successfully',
        details: { result }
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestSchedulers = async () => {
    setIsLoading(true)
    try {
      const result = await CampaignAndAssetSchedulerService.testBothSchedulers()
      setResults({
        success: true,
        message: 'Scheduler test completed',
        details: { result }
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDebugArchive = async () => {
    setIsLoading(true)
    try {
      await debugAssetArchive()
      setResults({
        success: true,
        message: 'Debug completed - check console for details'
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSchedulerTest = async () => {
    setIsLoading(true)
    try {
      await manualSchedulerTest()
      setResults({
        success: true,
        message: 'Manual scheduler test completed - check console for details'
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckCronStatus = async () => {
    setIsLoading(true)
    try {
      await checkCronStatus()
      setResults({
        success: true,
        message: 'Cron status check completed - check console for details'
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestGoogleDriveMovement = async () => {
    setIsLoading(true)
    try {
      await testGoogleDriveMovement()
      setResults({
        success: true,
        message: 'Google Drive movement test completed - check console for details'
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTriggerSchedulerWithLogs = async () => {
    setIsLoading(true)
    try {
      await triggerSchedulerWithLogs()
      setResults({
        success: true,
        message: 'Scheduler triggered with detailed logs - check console and Supabase Edge Function logs'
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestDatabaseAccess = async () => {
    setIsLoading(true)
    try {
      await testDatabaseAccess()
      setResults({
        success: true,
        message: 'Database access test completed - check console for details'
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Asset Archive Tester
      </h2>
      
      <div className="space-y-4">
        {/* Test Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleTestCampaignCompletion}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Test Campaign Completion
          </button>
          
          <button
            onClick={handleTriggerSchedulers}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Trigger Schedulers
          </button>
          
          <button
            onClick={handleTestSchedulers}
            disabled={isLoading}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Test Schedulers
          </button>
          
          <button
            onClick={handleDebugArchive}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Debug Archive Issue
          </button>
          
          <button
            onClick={handleManualSchedulerTest}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Manual Scheduler Test
          </button>
          
          <button
            onClick={handleCheckCronStatus}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Check Cron Status
          </button>
          
          <button
            onClick={handleTestGoogleDriveMovement}
            disabled={isLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            Test Google Drive Movement
          </button>
          
          <button
            onClick={handleTriggerSchedulerWithLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 disabled:opacity-50"
          >
            Trigger Scheduler with Logs
          </button>
          
          <button
            onClick={handleTestDatabaseAccess}
            disabled={isLoading}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
          >
            Test Database Access
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Testing...</span>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className={`rounded p-4 ${
            results.success 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              results.success 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {results.success ? 'Success' : 'Error'}
            </h3>
            <p className={`mb-2 ${
              results.success 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-red-700 dark:text-red-300'
            }`}>
              {results.message}
            </p>
            
            {results.details && (
              <div className="space-y-2">
                {results.details.campaignsFound !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Campaigns Found:</strong> {results.details.campaignsFound}
                  </p>
                )}
                {results.details.assetsFound !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Assets Found:</strong> {results.details.assetsFound}
                  </p>
                )}
                {results.details.campaignsProcessed !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Campaigns Processed:</strong> {results.details.campaignsProcessed}
                  </p>
                )}
                {results.details.assetsMoved !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Assets Moved:</strong> {results.details.assetsMoved}
                  </p>
                )}
                
                {results.details.errors && results.details.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Errors:</p>
                    <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                      {results.details.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results.details.campaignDetails && results.details.campaignDetails.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Campaign Details:</p>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {results.details.campaignDetails.map((campaign: any, index: number) => (
                        <div key={index} className="border-l-2 border-gray-300 pl-2">
                          <strong>{campaign.name}</strong> - Status: {campaign.status} - End: {campaign.end_date}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            How to Test
          </h3>
          <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li><strong>Test Campaign Completion:</strong> Finds campaigns that should be completed and checks their assets</li>
            <li><strong>Trigger Schedulers:</strong> Manually runs both schedulers to process campaigns and move assets</li>
            <li><strong>Test Schedulers:</strong> Runs a test of the schedulers without making changes</li>
          </ol>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
            <strong>Expected Result:</strong> You should see campaigns being found, assets being discovered, and assets being moved from active to archive status.
          </p>
        </div>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Asset Archive Tester
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Test and verify the asset archiving functionality for campaigns and assets.
            </p>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
