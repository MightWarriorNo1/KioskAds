import React, { useState, useEffect } from 'react';
import { Download, Filter, Calendar, Monitor, FileText, RefreshCw, Search, X, Play, Clock } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { ProofOfPlayService, ProofOfPlayRecord, ProofOfPlayFilters } from '../services/proofOfPlayService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function ProofOfPlayPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [records, setRecords] = useState<ProofOfPlayRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ProofOfPlayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState<ProofOfPlayFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  
  // Available options for filters
  const [campaigns, setCampaigns] = useState<Array<{id: string; name: string}>>([]);
  const [screens, setScreens] = useState<Array<{id: string; name: string; location: string}>>([]);
  const [assets, setAssets] = useState<Array<{id: string; file_name: string}>>([]);
  
  // Summary statistics
  const [summary, setSummary] = useState({
    totalPlays: 0,
    uniqueScreens: 0,
    uniqueAssets: 0,
    totalDuration: 0,
    averageDuration: 0,
    dateRange: { start: '', end: '' }
  });

  // Load data on component mount
  useEffect(() => {
    if (user?.id) {
      loadData();
      loadFilterOptions();
    } else {
      // If no user, set loading to false to prevent infinite loading
      setLoading(false);
    }
  }, [user?.id]);

  // Apply search filter
  useEffect(() => {
    if (!searchTerm) {
      setFilteredRecords(records);
    } else {
      const filtered = records.filter(record =>
        record.screenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.screenTags.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.assetTags.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRecords(filtered);
    }
  }, [searchTerm, records]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userFilters = { ...filters, accountId: user?.id };
      
      // Add timeout to prevent infinite loading (30 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      );
      
      const dataPromise = Promise.all([
        ProofOfPlayService.getProofOfPlayRecords(userFilters),
        ProofOfPlayService.getProofOfPlaySummary(userFilters)
      ]);
      
      const [recordsData, summaryData] = await Promise.race([dataPromise, timeoutPromise]) as any;
      
      setRecords(recordsData);
      setFilteredRecords(recordsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading Proof-of-Play data:', error);
      const errorMessage = error instanceof Error && error.message.includes('timeout') 
        ? 'Request timed out. Please try again or contact support if the issue persists.'
        : 'Failed to load Proof-of-Play data';
      addNotification('error', 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [campaignsData, screensData, assetsData] = await Promise.all([
        ProofOfPlayService.getAvailableCampaigns(user?.id),
        ProofOfPlayService.getAvailableScreens(),
        ProofOfPlayService.getAvailableAssets(user?.id)
      ]);
      
      setCampaigns(campaignsData);
      setScreens(screensData);
      setAssets(assetsData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof ProofOfPlayFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const applyFilters = () => {
    loadData();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setSearchTerm('');
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const userFilters = { ...filters, accountId: user?.id };
      const csvData = await ProofOfPlayService.exportProofOfPlayToCSV(userFilters);
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof-of-play-${filters.startDate}-to-${filters.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      addNotification('success', 'Export Complete', 'Proof-of-Play data has been exported to CSV');
    } catch (error) {
      console.error('Error exporting data:', error);
      addNotification('error', 'Export Failed', 'Failed to export Proof-of-Play data');
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Proof-of-Play"
        subtitle="Detailed play records and analytics for your campaigns"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Proof-of-Play data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Proof-of-Play"
      subtitle="Detailed play records and analytics for your campaigns"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Plays</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalPlays.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Monitor className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Screens</p>
              <p className="text-2xl font-bold text-gray-900">{summary.uniqueScreens}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Assets</p>
              <p className="text-2xl font-bold text-gray-900">{summary.uniqueAssets}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(summary.averageDuration)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search screens, assets, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Button */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          {/* Refresh Button */}
          <Button
            onClick={loadData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={exporting || filteredRecords.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Campaign Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
              <select
                value={filters.campaignId || ''}
                onChange={(e) => handleFilterChange('campaignId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Campaigns</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Screen Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Screen</label>
              <select
                value={filters.screenId || ''}
                onChange={(e) => handleFilterChange('screenId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Screens</option>
                {screens.map(screen => (
                  <option key={screen.id} value={screen.id}>
                    {screen.name} - {screen.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Date UTC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Screen Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Screen Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Time UTC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device Local Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileText className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium">No Proof-of-Play records found</p>
                      <p className="text-sm">Try adjusting your filters or date range</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.reportDateUTC}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{record.screenName}</div>
                      <div className="text-gray-500 text-xs">{record.screenUUID}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.screenTags || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{record.assetName}</div>
                      <div className="text-gray-500 text-xs">{record.assetId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.assetTags || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(record.startTimeUTC)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(record.deviceLocalTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatDuration(record.duration)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{filteredRecords.length}</span> of{' '}
                <span className="font-medium">{records.length}</span> records
              </div>
              <div className="text-sm text-gray-500">
                Date range: {summary.dateRange.start} to {summary.dateRange.end}
              </div>
            </div>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
