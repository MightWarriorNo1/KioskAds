import React, { useState, useEffect } from 'react';
import { Play, Monitor, Clock, TrendingUp, Eye, Calendar, Filter, RefreshCw } from 'lucide-react';
import { ProofOfPlayService, ProofOfPlayRecord, ProofOfPlayFilters } from '../../services/proofOfPlayService';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface ProofOfPlayWidgetProps {
  /** Filter by specific asset ID */
  assetId?: string;
  /** Filter by specific campaign ID */
  campaignId?: string;
  /** Filter by specific kiosk/screen ID */
  kioskId?: string;
  /** Filter by user/account ID */
  accountId?: string;
  /** Date range for the data */
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  /** Compact view for smaller spaces */
  compact?: boolean;
  /** Show detailed table */
  showTable?: boolean;
  /** Show export functionality */
  showExport?: boolean;
  /** Custom title */
  title?: string;
  /** Maximum number of records to show in table */
  maxRecords?: number;
  /** Callback when data is loaded */
  onDataLoaded?: (summary: any, records: ProofOfPlayRecord[]) => void;
}

export default function ProofOfPlayWidget({
  assetId,
  campaignId,
  kioskId,
  accountId,
  dateRange,
  compact = false,
  showTable = false,
  showExport = false,
  title = "Proof of Play",
  maxRecords = 10,
  onDataLoaded
}: ProofOfPlayWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ProofOfPlayRecord[]>([]);
  const [summary, setSummary] = useState({
    totalPlays: 0,
    uniqueScreens: 0,
    uniqueAssets: 0,
    totalDuration: 0,
    averageDuration: 0,
    dateRange: { start: '', end: '' }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      
      const filters: ProofOfPlayFilters = {
        startDate: dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: dateRange?.endDate || new Date().toISOString().split('T')[0],
        assetId,
        campaignId,
        kioskId,
        accountId
      };

      const [recordsData, summaryData] = await Promise.all([
        ProofOfPlayService.getProofOfPlayRecords(filters),
        ProofOfPlayService.getProofOfPlaySummary(filters)
      ]);

      setRecords(recordsData.slice(0, maxRecords));
      setSummary(summaryData);
      
      if (onDataLoaded) {
        onDataLoaded(summaryData, recordsData);
      }
    } catch (error) {
      console.error('Error loading Proof-of-Play data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assetId, campaignId, kioskId, accountId, dateRange?.startDate, dateRange?.endDate]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const handleExport = async () => {
    try {
      const filters: ProofOfPlayFilters = {
        startDate: dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: dateRange?.endDate || new Date().toISOString().split('T')[0],
        assetId,
        campaignId,
        kioskId,
        accountId
      };
      
      const csvData = await ProofOfPlayService.exportProofOfPlayToCSV(filters);
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof-of-play-${filters.startDate}-to-${filters.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading PoP data...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {showExport && (
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-4 mb-4 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div className="flex items-center p-3 bg-blue-50 dark:bg-gray-800 rounded-lg border border-white">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Play className="h-4 w-4 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Total Plays</p>
            <p className="text-lg font-bold text-gray-900">{summary.totalPlays.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-green-50 dark:bg-gray-800 border border-white rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <Monitor className="h-4 w-4 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Screens</p>
            <p className="text-lg font-bold text-gray-900">{summary.uniqueScreens}</p>
          </div>
        </div>

        {!compact && (
          <>
            <div className="flex items-center p-3 bg-purple-50 dark:bg-gray-800 border border-white rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Assets</p>
                <p className="text-lg font-bold text-gray-900">{summary.uniqueAssets}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-orange-50 dark:bg-gray-800 border border-whiterounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Avg Duration</p>
                <p className="text-lg font-bold text-gray-900">{formatDuration(summary.averageDuration)}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Date Range Info */}
      {summary.dateRange.start && summary.dateRange.end && (
        <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {summary.dateRange.start} to {summary.dateRange.end}
        </div>
      )}

      {/* Table */}
      {showTable && records.length > 0 && (
        <div className="mt-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Screen
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Played At
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{record.screenName}</div>
                      <div className="text-gray-500 text-xs">{record.screenUUID}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{record.assetName}</div>
                      <div className="text-gray-500 text-xs">{record.assetId}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(record.startTimeUTC)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatDuration(record.duration)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {records.length === maxRecords && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              Showing first {maxRecords} records
            </div>
          )}
        </div>
      )}

      {/* No Data Message */}
      {records.length === 0 && (
        <div className="text-center py-8">
          <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No play records found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or date range</p>
        </div>
      )}
    </Card>
  );
}
