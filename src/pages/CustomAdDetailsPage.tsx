import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Users,
  Target,
  Palette,
  MessageSquare,
  Plus,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { CustomAdCreationService, CustomAdCreationWithFiles } from '../services/customAdCreationService';
import { formatFileSize, getFileIcon, getFileTypeDisplayName, getAspectRatio } from '../utils/customAdFileValidation';
import Button from '../components/ui/Button';

export default function CustomAdDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [customAd, setCustomAd] = useState<CustomAdCreationWithFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomAd();
    }
  }, [id]);

  const loadCustomAd = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const ad = await CustomAdCreationService.getCustomAdCreation(id);
      setCustomAd(ad);
    } catch (error) {
      console.error('Error loading custom ad:', error);
      addNotification('error', 'Load Failed', 'Failed to load custom ad creation');
      navigate('/client/custom-ads/manage');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customAd || !confirm('Are you sure you want to delete this custom ad creation? This action cannot be undone.')) {
      return;
    }

    try {
      await CustomAdCreationService.deleteCustomAdCreation(customAd.id);
      addNotification('success', 'Deleted', 'Custom ad creation deleted successfully');
      navigate('/client/custom-ads/manage');
    } catch (error) {
      console.error('Error deleting custom ad creation:', error);
      addNotification('error', 'Delete Failed', 'Failed to delete custom ad creation');
    }
  };

  const handleSubmitForReview = async () => {
    if (!customAd) return;

    try {
      await CustomAdCreationService.submitForReview(customAd.id);
      addNotification('success', 'Submitted', 'Custom ad creation submitted for review');
      loadCustomAd(); // Reload to get updated status
    } catch (error) {
      console.error('Error submitting for review:', error);
      addNotification('error', 'Submission Failed', 'Failed to submit for review');
    }
  };

  const handleAddNote = async () => {
    if (!customAd || !newNote.trim() || !user?.id) return;

    try {
      setIsAddingNote(true);
      await CustomAdCreationService.addNote(
        customAd.id,
        user.id,
        newNote.trim(),
        'comment',
        false
      );
      setNewNote('');
      addNotification('success', 'Note Added', 'Note added successfully');
      loadCustomAd(); // Reload to get updated notes
    } catch (error) {
      console.error('Error adding note:', error);
      addNotification('error', 'Failed', 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-5 h-5 text-gray-500" />;
      case 'submitted':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'in_review':
        return <Eye className="w-5 h-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
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

  const getTotalFileSize = () => {
    if (!customAd) return 0;
    return customAd.media_files.reduce((sum, file) => sum + file.file_size, 0);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!customAd) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Custom Ad Creation Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The custom ad creation you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate('/client/custom-ads/manage')}>
            Back to My Custom Ads
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => navigate('/client/custom-ads/manage')}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {customAd.title}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(customAd.status)}
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(customAd.status)}`}>
                  {customAd.status.replace('_', ' ')}
                </span>
              </div>
              <span className={`text-sm font-medium ${getPriorityColor(customAd.priority)}`}>
                {customAd.priority} priority
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {customAd.status === 'draft' && (
            <>
              <Button
                onClick={() => navigate(`/client/custom-ads/${customAd.id}/edit`)}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </Button>
              
              <Button
                onClick={handleSubmitForReview}
                className="flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit for Review</span>
              </Button>
              
              <Button
                onClick={handleDelete}
                variant="secondary"
                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Description
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {customAd.description || 'No description provided.'}
            </p>
          </div>

          {/* Media Files */}
          {customAd.media_files.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Media Files ({customAd.media_files.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customAd.media_files.map((file) => (
                  <div
                    key={file.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {file.original_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getFileTypeDisplayName(file.mime_type)} • {formatFileSize(file.file_size)}
                          </p>
                        </div>
                      </div>
                      
                      {file.public_url && (
                        <Button
                          onClick={() => window.open(file.public_url, '_blank')}
                          variant="secondary"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </Button>
                      )}
                    </div>
                    
                    {file.dimensions && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p>Dimensions: {file.dimensions.width} × {file.dimensions.height}</p>
                        {file.aspect_ratio && (
                          <p>Aspect Ratio: {file.aspect_ratio}</p>
                        )}
                        {file.duration && (
                          <p>Duration: {file.duration}s</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total size: {formatFileSize(getTotalFileSize())}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Notes & Communication
              </h2>
              <Button
                onClick={() => setShowNotes(!showNotes)}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-2"
              >
                {showNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showNotes ? 'Hide' : 'Show'} Notes</span>
              </Button>
            </div>

            {showNotes && (
              <div className="space-y-4">
                {/* Add Note Form */}
                {customAd.status !== 'completed' && (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Add a Note
                    </h3>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
                      placeholder="Add a note or question about this custom ad creation..."
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isAddingNote}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingNote ? 'Adding...' : 'Add Note'}</span>
                    </Button>
                  </div>
                )}

                {/* Notes List */}
                {customAd.notes.length > 0 ? (
                  <div className="space-y-3">
                    {customAd.notes
                      .filter(note => !note.is_internal) // Only show client-visible notes
                      .map((note) => (
                        <div
                          key={note.id}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {note.note_type === 'comment' ? 'Comment' : 
                               note.note_type === 'requirement' ? 'Requirement' :
                               note.note_type === 'feedback' ? 'Feedback' :
                               note.note_type === 'approval' ? 'Approval' :
                               note.note_type === 'rejection' ? 'Rejection' : 'Note'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {note.content}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No notes yet. Add a note to communicate with the team.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Project Details
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(customAd.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {customAd.deadline && (
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Deadline</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(customAd.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              
              {customAd.budget_range && (
                <div className="flex items-center text-sm">
                  <DollarSign className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Budget Range</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {customAd.budget_range}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center text-sm">
                <Palette className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {customAd.category || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(customAd.target_audience || customAd.brand_guidelines || customAd.special_requirements) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Additional Information
              </h3>
              
              <div className="space-y-4">
                {customAd.target_audience && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Target Audience
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {customAd.target_audience}
                    </p>
                  </div>
                )}
                
                {customAd.brand_guidelines && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      Brand Guidelines
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {customAd.brand_guidelines}
                    </p>
                  </div>
                )}
                
                {customAd.special_requirements && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Special Requirements
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {customAd.special_requirements}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
