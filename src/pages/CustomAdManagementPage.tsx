import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { CustomAdCreationService, CustomAdCreationWithFiles } from '../services/customAdCreationService';
import { formatFileSize, getFileIcon } from '../utils/customAdFileValidation';
import Button from '../components/ui/Button';

export default function CustomAdManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [customAds, setCustomAds] = useState<CustomAdCreationWithFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      loadCustomAds();
    }
  }, [user?.id]);

  const loadCustomAds = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const ads = await CustomAdCreationService.getUserCustomAdCreations(user.id);
      setCustomAds(ads);
    } catch (error) {
      console.error('Error loading custom ads:', error);
      addNotification('error', 'Load Failed', 'Failed to load custom ad creations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom ad creation? This action cannot be undone.')) {
      return;
    }

    try {
      await CustomAdCreationService.deleteCustomAdCreation(id);
      setCustomAds(prev => prev.filter(ad => ad.id !== id));
      addNotification('success', 'Deleted', 'Custom ad creation deleted successfully');
    } catch (error) {
      console.error('Error deleting custom ad creation:', error);
      addNotification('error', 'Delete Failed', 'Failed to delete custom ad creation');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4 text-gray-500" />;
      case 'submitted':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'in_review':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'normal':
        return 'text-blue-600 dark:text-blue-400';
      case 'low':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const filteredAds = customAds.filter(ad => {
    const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ad.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ad.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getTotalFileSize = (mediaFiles: any[]) => {
    return mediaFiles.reduce((sum, file) => sum + file.file_size, 0);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Custom Ad Creations
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your custom ad creation requests and track their progress
          </p>
        </div>
        
        <Button
          onClick={() => navigate('/client/custom-ads/create')}
          className="flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create New</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="Social Media Campaign">Social Media Campaign</option>
              <option value="Display Advertising">Display Advertising</option>
              <option value="Video Production">Video Production</option>
              <option value="Brand Identity">Brand Identity</option>
              <option value="Print Design">Print Design</option>
              <option value="Web Design">Web Design</option>
              <option value="Motion Graphics">Motion Graphics</option>
              <option value="Photography">Photography</option>
              <option value="Copywriting">Copywriting</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom Ads List */}
      {filteredAds.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No custom ad creations found
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {customAds.length === 0 
              ? "You haven't created any custom ad requests yet."
              : "No custom ad creations match your current filters."
            }
          </p>
          {customAds.length === 0 && (
            <Button
              onClick={() => navigate('/client/custom-ads/create')}
              className="flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Custom Ad</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAds.map((ad) => (
            <div
              key={ad.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {ad.title}
                  </h3>
                  <div className="flex items-center space-x-2 ml-2">
                    {getStatusIcon(ad.status)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ad.status)}`}>
                      {ad.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                {ad.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3">
                    {ad.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {ad.category}
                  </span>
                  <span className={`font-medium ${getPriorityColor(ad.priority)}`}>
                    {ad.priority}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Created {new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
                
                {ad.deadline && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Deadline: {new Date(ad.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                
                {ad.budget_range && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>{ad.budget_range}</span>
                  </div>
                )}
                
                {ad.media_files.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <FileText className="w-4 h-4 mr-2" />
                    <span>
                      {ad.media_files.length} file{ad.media_files.length !== 1 ? 's' : ''} 
                      ({formatFileSize(getTotalFileSize(ad.media_files))})
                    </span>
                  </div>
                )}
              </div>

              {/* Media Files Preview */}
              {ad.media_files.length > 0 && (
                <div className="px-6 pb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Files:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ad.media_files.slice(0, 3).map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-xs"
                      >
                        <span>{getFileIcon(file.mime_type)}</span>
                        <span className="text-gray-600 dark:text-gray-300 truncate max-w-20">
                          {file.original_name}
                        </span>
                      </div>
                    ))}
                    {ad.media_files.length > 3 && (
                      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-xs">
                        <span className="text-gray-600 dark:text-gray-300">
                          +{ad.media_files.length - 3} more
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => navigate(`/client/custom-ads/${ad.id}`)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </Button>
                  
                  {ad.status === 'draft' && (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => navigate(`/client/custom-ads/${ad.id}/edit`)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </Button>
                      
                      <Button
                        onClick={() => handleDelete(ad.id)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
