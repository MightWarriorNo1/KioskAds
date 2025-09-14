import { useState, useEffect } from 'react';
import { Folder, FolderOpen, Plus, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService } from '../../services/adminService';
import { GoogleDriveService } from '../../services/googleDriveService';
import { useSearchParams } from 'react-router-dom';

interface Kiosk {
  id: string;
  name: string;
  location: string;
  status: string;
}

interface GoogleDriveConfig {
  id: string;
  name: string;
  is_active: boolean;
}

interface KioskGDriveFolder {
  id: string;
  kiosk_id: string;
  gdrive_config_id: string;
  active_folder_id: string;
  archive_folder_id: string;
  kiosk?: Kiosk;
  gdrive_config?: GoogleDriveConfig;
}

interface FolderAssignmentForm {
  kiosk_id: string;
  gdrive_config_id: string;
  active_folder_id: string;
  archive_folder_id: string;
}

export default function KioskGDriveFolderManager() {
  const { addNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [gdriveConfigs, setGdriveConfigs] = useState<GoogleDriveConfig[]>([]);
  const [folderAssignments, setFolderAssignments] = useState<KioskGDriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<KioskGDriveFolder | null>(null);
  const [formData, setFormData] = useState<FolderAssignmentForm>({
    kiosk_id: '',
    gdrive_config_id: '',
    active_folder_id: '',
    archive_folder_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const kioskId = searchParams.get('kiosk');
    if (kioskId && kiosks.length > 0) {
      setFormData(prev => ({ ...prev, kiosk_id: kioskId }));
      setShowForm(true);
    }
  }, [searchParams, kiosks]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadKiosks(),
        loadGDriveConfigs(),
        loadFolderAssignments()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      addNotification('error', 'Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadKiosks = async () => {
    try {
      const kiosksData = await AdminService.getAllKiosks();
      setKiosks(kiosksData);
    } catch (error) {
      console.error('Error loading kiosks:', error);
    }
  };

  const loadGDriveConfigs = async () => {
    try {
      const configs = await AdminService.getGoogleDriveConfigs();
      setGdriveConfigs(configs);
    } catch (error) {
      console.error('Error loading Google Drive configs:', error);
    }
  };

  const loadFolderAssignments = async () => {
    try {
      const assignments = await AdminService.getKioskGDriveFolderAssignments();
      setFolderAssignments(assignments);
    } catch (error) {
      console.error('Error loading folder assignments:', error);
    }
  };

  const handleCreateNew = () => {
    setEditingAssignment(null);
    setFormData({
      kiosk_id: '',
      gdrive_config_id: '',
      active_folder_id: '',
      archive_folder_id: ''
    });
    setShowForm(true);
  };

  const handleEdit = (assignment: KioskGDriveFolder) => {
    setEditingAssignment(assignment);
    setFormData({
      kiosk_id: assignment.kiosk_id,
      gdrive_config_id: assignment.gdrive_config_id,
      active_folder_id: assignment.active_folder_id,
      archive_folder_id: assignment.archive_folder_id
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (editingAssignment) {
        await AdminService.updateKioskGDriveFolderAssignment(editingAssignment.id, formData);
        addNotification('success', 'Success', 'Folder assignment updated successfully');
      } else {
        await AdminService.createKioskGDriveFolderAssignment(formData);
        addNotification('success', 'Success', 'Folder assignment created successfully');
      }
      
      setShowForm(false);
      await loadFolderAssignments();
    } catch (error) {
      console.error('Error saving folder assignment:', error);
      addNotification('error', 'Error', 'Failed to save folder assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this folder assignment?')) {
      return;
    }

    try {
      await AdminService.deleteKioskGDriveFolderAssignment(assignmentId);
      addNotification('success', 'Success', 'Folder assignment deleted successfully');
      await loadFolderAssignments();
    } catch (error) {
      console.error('Error deleting folder assignment:', error);
      addNotification('error', 'Error', 'Failed to delete folder assignment');
    }
  };

  const handleCreateFolders = async (assignment: KioskGDriveFolder) => {
    try {
      const kiosk = kiosks.find(k => k.id === assignment.kiosk_id);
      if (!kiosk) return;

      const results = await GoogleDriveService.createKioskFolders(assignment.gdrive_config_id, [kiosk]);
      
      if (results.length > 0 && results[0].status === 'ready') {
        addNotification('success', 'Success', 'Folders created successfully');
        await loadFolderAssignments();
      } else {
        addNotification('error', 'Error', 'Failed to create folders');
      }
    } catch (error) {
      console.error('Error creating folders:', error);
      addNotification('error', 'Error', 'Failed to create folders');
    }
  };

  const getStatusIcon = (assignment: KioskGDriveFolder) => {
    if (assignment.active_folder_id && assignment.archive_folder_id) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (assignment.active_folder_id || assignment.archive_folder_id) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (assignment: KioskGDriveFolder) => {
    if (assignment.active_folder_id && assignment.archive_folder_id) {
      return 'Complete';
    } else if (assignment.active_folder_id || assignment.archive_folder_id) {
      return 'Partial';
    } else {
      return 'Not Set';
    }
  };

  const getStatusColor = (assignment: KioskGDriveFolder) => {
    if (assignment.active_folder_id && assignment.archive_folder_id) {
      return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
    } else if (assignment.active_folder_id || assignment.archive_folder_id) {
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
    } else {
      return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading folder assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kiosk Google Drive Folders</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage Google Drive folder assignments for kiosks</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Assign Folders</span>
        </button>
      </div>

      {/* Folder Assignments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kiosk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Google Drive Config
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Active Folder ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Archive Folder ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {folderAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Folder className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No folder assignments found</p>
                    <p className="text-sm">Create your first folder assignment to get started</p>
                  </td>
                </tr>
              ) : (
                folderAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {assignment.kiosk?.name || 'Unknown Kiosk'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {assignment.kiosk?.location || 'Unknown Location'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {assignment.gdrive_config?.name || 'Unknown Config'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(assignment)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment)}`}>
                          {getStatusText(assignment)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {assignment.active_folder_id || 'Not set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {assignment.archive_folder_id || 'Not set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(assignment)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCreateFolders(assignment)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Create Folders"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingAssignment ? 'Edit Folder Assignment' : 'Create Folder Assignment'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kiosk
                </label>
                <select
                  value={formData.kiosk_id}
                  onChange={(e) => setFormData({ ...formData, kiosk_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a kiosk</option>
                  {kiosks.map((kiosk) => (
                    <option key={kiosk.id} value={kiosk.id}>
                      {kiosk.name} - {kiosk.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Google Drive Configuration
                </label>
                <select
                  value={formData.gdrive_config_id}
                  onChange={(e) => setFormData({ ...formData, gdrive_config_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a Google Drive config</option>
                  {gdriveConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Active Folder ID
                </label>
                <input
                  type="text"
                  value={formData.active_folder_id}
                  onChange={(e) => setFormData({ ...formData, active_folder_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter Google Drive folder ID for active ads"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Archive Folder ID
                </label>
                <input
                  type="text"
                  value={formData.archive_folder_id}
                  onChange={(e) => setFormData({ ...formData, archive_folder_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter Google Drive folder ID for archived ads"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAssignment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
