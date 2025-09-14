import React, { useState, useEffect } from 'react';
import { Play, Monitor, Clock, FileText, Download, RefreshCw, Eye } from 'lucide-react';
import { ProofOfPlayService, ProofOfPlayRecord, ProofOfPlayFilters } from '../../services/proofOfPlayService';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface AssetProofOfPlayWidgetProps {
  /** Asset ID to get PoP information for */
  assetId: string;
  /** Additional filters */
  filters?: Omit<ProofOfPlayFilters, 'assetId'>;
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
  onDataLoaded?: (data: any) => void;
}

export default function AssetProofOfPlayWidget({
  assetId,
  filters = {},
  compact = false,
  showTable = false,
  showExport = false,
  title,
  maxRecords = 10,
  onDataLoaded
}: AssetProofOfPlayWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    asset: {
      id: string;
      name: string;
      type: string;
      duration?: number;
    };
    summary: {
      totalPlays: number;
      uniqueScreens: number;
      totalDuration: number;
      averageDuration: number;
      dateRange: { start: string; end: string };
    };
    records: ProofOfPlayRecord[];
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const assetData = await ProofOfPlayService.getAssetProofOfPlay(assetId, filters);
      setData(assetData);
      
      if (onDataLoaded) {
        onDataLoaded(assetData);
      }
    } catch (error) {
      console.error('Error loading asset Proof-of-Play data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      loadData();
    }
  }, [assetId, JSON.stringify(filters)]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const handleExport = async () => {
    if (!data) return;
    
    try {
      const assetFilters = { ...filters, assetId };
      const csvData = await ProofOfPlayService.exportProofOfPlayToCSV(assetFilters);
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asset-proof-of-play-${data.asset.name}-${filters.startDate || 'all'}.csv`;
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
            <p className="text-gray-600 text-sm">Loading asset PoP data...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Asset not found or no data available</p>
        </div>
      </Card>
    );
  }

  const displayTitle = title || `Proof of Play - ${data.asset.name}`;
  const displayRecords = data.records.slice(0, maxRecords);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{displayTitle}</h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {data.asset.type.toUpperCase()}
            </span>
            {data.asset.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(data.asset.duration)}
              </span>
            )}
          </div>
        </div>
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
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-4 mb-4 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Play className="h-4 w-4 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Total Plays</p>
            <p className="text-lg font-bold text-gray-900">{data.summary.totalPlays.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-green-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <Monitor className="h-4 w-4 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Screens</p>
            <p className="text-lg font-bold text-gray-900">{data.summary.uniqueScreens}</p>
          </div>
        </div>

        {!compact && (
          <>
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Duration</p>
                <p className="text-lg font-bold text-gray-900">{formatDuration(data.summary.totalDuration)}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-orange-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Eye className="h-4 w-4 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Avg Duration</p>
                <p className="text-lg font-bold text-gray-900">{formatDuration(data.summary.averageDuration)}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Date Range Info */}
      {data.summary.dateRange.start && data.summary.dateRange.end && (
        <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {data.summary.dateRange.start} to {data.summary.dateRange.end}
        </div>
      )}

      {/* Table */}
      {showTable && displayRecords.length > 0 && (
        <div className="mt-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Screen
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
                {displayRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{record.screenName}</div>
                      <div className="text-gray-500 text-xs">{record.screenUUID}</div>
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
          
          {data.records.length > maxRecords && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              Showing first {maxRecords} of {data.records.length} records
            </div>
          )}
        </div>
      )}

      {/* No Data Message */}
      {displayRecords.length === 0 && (
        <div className="text-center py-8">
          <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No play records found for this asset</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or date range</p>
        </div>
      )}
    </Card>
  );
}
