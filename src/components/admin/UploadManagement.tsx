import React, { useState, useEffect } from 'react';
import { GoogleDriveService } from '../../services/googleDriveService';
import { UploadJob, SyncJob, Campaign, Kiosk } from '../../types/database';
import { supabase } from '../../lib/supabaseClient';

interface UploadManagementProps {
  onUploadChange?: () => void;
}

export const UploadManagement: React.FC<UploadManagementProps> = ({
  onUploadChange
}) => {
  const [activeTab, setActiveTab] = useState<'uploads' | 'sync'>('uploads');
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedKiosks, setSelectedKiosks] = useState<string[]>([]);
  const [uploadType, setUploadType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledTime, setScheduledTime] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);

  const [filters, setFilters] = useState({
    status: '',
    upload_type: '',
    kiosk_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadUploadJobs(),
      loadSyncJobs(),
      loadCampaigns(),
      loadKiosks()
    ]);
  };

  const loadUploadJobs = async () => {
    try {
      setIsLoading(true);
      const jobs = await GoogleDriveService.getUploadJobs(filters);
      setUploadJobs(jobs);
    } catch (error) {
      console.error('Error loading upload jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncJobs = async () => {
    try {
      const jobs = await GoogleDriveService.getSyncJobs(filters);
      setSyncJobs(jobs);
    } catch (error) {
      console.error('Error loading sync jobs:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadKiosks = async () => {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .order('name');

      if (error) throw error;
      setKiosks(data || []);
    } catch (error) {
      console.error('Error loading kiosks:', error);
    }
  };

  const handleScheduleUpload = async () => {
    if (!selectedCampaign || selectedKiosks.length === 0) {
      alert('Please select a campaign and at least one kiosk');
      return;
    }

    try {
      setIsLoading(true);
      
      const scheduledTimeValue = uploadType === 'scheduled' && scheduledTime 
        ? scheduledTime 
        : new Date().toISOString();

      const jobIds = await GoogleDriveService.scheduleImmediateUpload(
        selectedCampaign,
        selectedKiosks,
        uploadType,
        scheduledTimeValue
      );

      if (jobIds.length > 0) {
        alert(`Successfully scheduled ${jobIds.length} upload jobs`);
        await loadUploadJobs();
        onUploadChange?.();
      }
    } catch (error) {
      console.error('Error scheduling upload:', error);
      alert('Error scheduling upload: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string, jobType: 'upload' | 'sync') => {
    try {
      if (jobType === 'upload') {
        await GoogleDriveService.updateUploadJobStatus(jobId, 'pending');
      } else {
        await GoogleDriveService.updateSyncJobStatus(jobId, 'pending');
      }
      
      await loadData();
    } catch (error) {
      console.error('Error retrying job:', error);
    }
  };

  const handleCancelJob = async (jobId: string, jobType: 'upload' | 'sync') => {
    try {
      if (jobType === 'upload') {
        await GoogleDriveService.updateUploadJobStatus(jobId, 'cancelled');
      } else {
        await GoogleDriveService.updateSyncJobStatus(jobId, 'failed');
      }
      
      await loadData();
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'uploading':
      case 'syncing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Management</h3>
          <p className="text-sm text-gray-500">
            Manage automated ad uploads and sync jobs to Google Drive
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('uploads')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'uploads'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upload Jobs
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'sync'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sync Jobs
          </button>
        </div>
      </div>

      {/* Upload Jobs Tab */}
      {activeTab === 'uploads' && (
        <div className="space-y-6">
          {/* Schedule New Upload */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Schedule New Upload</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign
                </label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kiosks
                </label>
                <select
                  multiple
                  value={selectedKiosks}
                  onChange={(e) => setSelectedKiosks(Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={4}
                >
                  {kiosks.map((kiosk) => (
                    <option key={kiosk.id} value={kiosk.id}>
                      {kiosk.name} - {kiosk.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Upload Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as 'immediate' | 'scheduled')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="immediate">Send Now</option>
                  <option value="scheduled">Schedule for Later</option>
                </select>
              </div>

              {uploadType === 'scheduled' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={handleScheduleUpload}
                disabled={isLoading || !selectedCampaign || selectedKiosks.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Scheduling...' : 'Schedule Upload'}
              </button>
            </div>
          </div>

          {/* Upload Jobs List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Upload Jobs</h4>
                <button
                  onClick={loadUploadJobs}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kiosk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Media Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.campaign?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.kiosk?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.media_asset?.file_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(job.scheduled_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {job.status === 'failed' && (
                            <button
                              onClick={() => handleRetryJob(job.id, 'upload')}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Retry
                            </button>
                          )}
                          {(job.status === 'pending' || job.status === 'uploading') && (
                            <button
                              onClick={() => handleCancelJob(job.id, 'upload')}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {uploadJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No upload jobs found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Jobs Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Sync Jobs List */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900">Sync Jobs</h4>
                <button
                  onClick={loadSyncJobs}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kiosk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Files Synced
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Files Archived
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Files Activated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.kiosk?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.sync_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.files_synced}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.files_archived}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.files_activated}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {job.status === 'failed' && (
                            <button
                              onClick={() => handleRetryJob(job.id, 'sync')}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {syncJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No sync jobs found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
