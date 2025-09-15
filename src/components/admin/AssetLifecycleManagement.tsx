import { useState, useEffect } from 'react';
import { Archive, RefreshCw, RotateCcw, Trash2, Eye, Clock, HardDrive, AlertCircle, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService, AssetLifecycleItem } from '../../services/adminService';
import { GoogleDriveService } from '../../services/googleDriveService';
import { MediaService } from '../../services/mediaService';

export default function AssetLifecycleManagement() {
  const [assets, setAssets] = useState<AssetLifecycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingAsset, setProcessingAsset] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetLifecycleItem | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const assetData = await AdminService.getAssetLifecycle();
      
      // Log any assets with missing media_asset data for debugging
      const invalidAssets = assetData.filter(asset => !asset.media_asset);
      if (invalidAssets.length > 0) {
        console.warn(`Found ${invalidAssets.length} asset lifecycle records with missing media_asset data:`, invalidAssets);
      }
      
      setAssets(assetData);
    } catch (error) {
      console.error('Error loading asset lifecycle:', error);
      addNotification('error', 'Error', 'Failed to load asset lifecycle data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreAsset = async (assetId: string, driveFileId: string) => {
    try {
      setProcessingAsset(assetId);
      await GoogleDriveService.restoreAsset(assetId, driveFileId);
      await AdminService.restoreAsset(assetId);
      
      setAssets(prev => prev.map(asset => 
        asset.id === assetId 
          ? { 
              ...asset, 
              status: 'active', 
              google_drive_folder: 'active',
              restored_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : asset
      ));

      addNotification('success', 'Asset Restored', 'Asset has been restored to active folder');
    } catch (error) {
      console.error('Error restoring asset:', error);
      addNotification('error', 'Error', 'Failed to restore asset');
    } finally {
      setProcessingAsset(null);
    }
  };

  const handleViewAsset = (asset: AssetLifecycleItem) => {
    setSelectedAsset(asset);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedAsset(null);
  };

  const processAssetLifecycle = async () => {
    try {
      setLoading(true);
      await GoogleDriveService.processAssetLifecycle();
      await loadAssets();
      addNotification('success', 'Processing Complete', 'Asset lifecycle has been processed');
    } catch (error) {
      console.error('Error processing asset lifecycle:', error);
      addNotification('error', 'Error', 'Failed to process asset lifecycle');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'archived': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'deleted': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return HardDrive;
      case 'archived': return Archive;
      case 'deleted': return Trash2;
      default: return HardDrive;
    }
  };

  const filteredAssets = assets.filter(asset => {
    // Filter out assets with null media_asset data
    if (!asset.media_asset) {
      console.warn('Asset lifecycle record with null media_asset:', asset);
      return false;
    }
    
    if (statusFilter === 'all') return true;
    return asset.status === statusFilter;
  });

  const validAssets = assets.filter(asset => asset.media_asset);
  const stats = {
    total: validAssets.length,
    active: validAssets.filter(a => a.status === 'active').length,
    archived: validAssets.filter(a => a.status === 'archived').length,
    deleted: validAssets.filter(a => a.status === 'deleted').length
  };

  const getDaysSinceArchived = (archivedAt: string) => {
    const archived = new Date(archivedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - archived.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilDeletion = (archivedAt: string) => {
    const daysSinceArchived = getDaysSinceArchived(archivedAt);
    return Math.max(0, 90 - daysSinceArchived);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Asset Lifecycle Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage Google Drive asset lifecycle with automatic archiving and deletion</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={processAssetLifecycle}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Process Lifecycle</span>
          </button>
          <button
            onClick={loadAssets}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <HardDrive className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <HardDrive className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Archived</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.archived}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Archive className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deleted</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.deleted}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all" className="text-gray-900 dark:text-white">All Statuses</option>
              <option value="active" className="text-gray-900 dark:text-white">Active</option>
              <option value="archived" className="text-gray-900 dark:text-white">Archived</option>
              <option value="deleted" className="text-gray-900 dark:text-white">Deleted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Asset Lifecycle</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading asset lifecycle...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-6 text-center">
            <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assets found</h3>
            <p className="text-gray-500 dark:text-gray-400">No assets match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Google Drive
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Timeline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAssets.map((asset) => {
                  const StatusIcon = getStatusIcon(asset.status);
                  const daysUntilDeletion = asset.archived_at ? getDaysUntilDeletion(asset.archived_at) : null;
                  
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <StatusIcon className="h-5 w-5 text-purple-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {asset.media_asset?.file_name || 'Unknown Asset'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {asset.media_asset?.file_type || 'Unknown Type'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {asset.campaign ? (
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">{asset.campaign.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Ended: {new Date(asset.campaign.end_date).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">No campaign</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {asset.google_drive_folder || 'Not synced'}
                        </div>
                        {asset.google_drive_file_id && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {asset.google_drive_file_id.slice(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          Created: {new Date(asset.created_at).toLocaleDateString()}
                        </div>
                        {asset.archived_at && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Archived: {new Date(asset.archived_at).toLocaleDateString()}
                          </div>
                        )}
                        {asset.deleted_at && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Deleted: {new Date(asset.deleted_at).toLocaleDateString()}
                          </div>
                        )}
                        {asset.restored_at && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            Restored: {new Date(asset.restored_at).toLocaleDateString()}
                          </div>
                        )}
                        {daysUntilDeletion !== null && daysUntilDeletion > 0 && (
                          <div className="text-sm text-yellow-600 dark:text-yellow-400">
                            Deletes in {daysUntilDeletion} days
                          </div>
                        )}
                        {daysUntilDeletion === 0 && (
                          <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                            Ready for deletion
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {asset.status === 'archived' && asset.google_drive_file_id && (
                            <button
                              onClick={() => handleRestoreAsset(asset.id, asset.google_drive_file_id!)}
                              disabled={processingAsset === asset.id}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center space-x-1 disabled:opacity-50"
                              title="Restore asset"
                            >
                              {processingAsset === asset.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                              <span>Restore</span>
                            </button>
                          )}
                          <button 
                            onClick={() => handleViewAsset(asset)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lifecycle Information */}
      <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">Asset Lifecycle Rules</h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
          <div className="flex items-start space-x-2">
            <HardDrive className="h-4 w-4 text-blue-600 mt-0.5" />
            <p><strong>Active:</strong> Assets from active campaigns are stored in the Active folder</p>
          </div>
          <div className="flex items-start space-x-2">
            <Archive className="h-4 w-4 text-blue-600 mt-0.5" />
            <p><strong>Archived:</strong> Assets from ended campaigns are moved to the Archive folder</p>
          </div>
          <div className="flex items-start space-x-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
            <p><strong>90-Day Rule:</strong> Archived assets are automatically deleted after 90 days</p>
          </div>
          <div className="flex items-start space-x-2">
            <RotateCcw className="h-4 w-4 text-blue-600 mt-0.5" />
            <p><strong>Restore:</strong> Admins can manually restore assets within the 90-day window</p>
          </div>
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <p><strong>Metadata:</strong> Campaign metadata is preserved even after asset deletion</p>
          </div>
        </div>
      </div>

      {/* Asset View Modal */}
      {showViewModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Asset Details
              </h3>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Asset Preview */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Preview
                  </h4>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    {selectedAsset.media_asset.file_type === 'video' ? (
                      <video
                        src={MediaService.getMediaPreviewUrl(selectedAsset.media_asset.file_path)}
                        controls
                        className="w-full h-auto max-h-96"
                      />
                    ) : (
                      <img
                        src={MediaService.getMediaPreviewUrl(selectedAsset.media_asset.file_path)}
                        alt={selectedAsset.media_asset.file_name}
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Asset Details */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Details
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        File Name
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedAsset.media_asset.file_name}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        File Type
                      </label>
                      <p className="text-gray-900 dark:text-white capitalize">
                        {selectedAsset.media_asset.file_type}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAsset.status)} text-white`}>
                        {selectedAsset.status}
                      </span>
                    </div>

                    {selectedAsset.campaign && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Campaign
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {selectedAsset.campaign.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Ends: {new Date(selectedAsset.campaign.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Google Drive Folder
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedAsset.google_drive_folder || 'Not specified'}
                      </p>
                    </div>

                    {selectedAsset.archived_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Archived Date
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(selectedAsset.archived_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getDaysSinceArchived(selectedAsset.archived_at)} days ago
                        </p>
                      </div>
                    )}

                    {selectedAsset.restored_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Restored Date
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(selectedAsset.restored_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Created Date
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(selectedAsset.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeViewModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
