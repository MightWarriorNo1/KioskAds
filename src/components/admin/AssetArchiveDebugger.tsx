/**
 * Asset Archive Debugger Component
 * This component provides a debug interface for testing and monitoring asset archiving
 */

import React, { useState } from 'react'
import { CampaignAndAssetSchedulerService } from '../../services/campaignAndAssetSchedulerService'
import { verifyAssetArchiveFix } from '../../utils/testAssetArchiveFixVerification'

interface DebugResult {
  success: boolean
  message: string
  details: any
}

export default function AssetArchiveDebugger() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DebugResult | null>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)

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

  const handleVerifyFix = async () => {
    setIsLoading(true)
    try {
      const result = await verifyAssetArchiveFix()
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

  const handleCheckStatus = async () => {
    setIsLoading(true)
    try {
      const schedulerInfo = await CampaignAndAssetSchedulerService.getSchedulerInfo()
      setSchedulerStatus(schedulerInfo)
    } catch (error) {
      console.error('Error checking scheduler status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Asset Archive Debugger
      </h2>
      
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCheckStatus}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Check Status
          </button>
          
          <button
            onClick={handleTestSchedulers}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Test Schedulers
          </button>
          
          <button
            onClick={handleTriggerSchedulers}
            disabled={isLoading}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Trigger Schedulers
          </button>
          
          <button
            onClick={handleVerifyFix}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Verify Fix
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Processing...</span>
          </div>
        )}

        {/* Scheduler Status */}
        {schedulerStatus && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Scheduler Status
            </h3>
            <pre className="text-sm text-gray-600 dark:text-gray-300 overflow-auto">
              {JSON.stringify(schedulerStatus, null, 2)}
            </pre>
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
              <pre className="text-sm text-gray-600 dark:text-gray-300 overflow-auto max-h-96">
                {JSON.stringify(results.details, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            How to Use
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Check Status:</strong> View current scheduler configuration and status</li>
            <li>• <strong>Test Schedulers:</strong> Run a test of both schedulers without making changes</li>
            <li>• <strong>Trigger Schedulers:</strong> Manually run both schedulers to process campaigns</li>
            <li>• <strong>Verify Fix:</strong> Comprehensive test to verify the asset archiving fix is working</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

