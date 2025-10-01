import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
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
  Plus,
  Eye,
  EyeOff,
  Download,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { CustomAdCreationService, CustomAdCreationWithFiles } from '../services/customAdCreationService';
import Button from '../components/ui/Button';
import DashboardLayout from '../components/layouts/DashboardLayout';

export default function ManageMyCustomAdPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [customAds, setCustomAds] = useState<CustomAdCreationWithFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<CustomAdCreationWithFiles | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed'>('all');

  useEffect(() => {
    loadCustomAds();
  }, [user?.id]);

  const loadCustomAds = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      const ads = await CustomAdCreationService.getUserCustomAdCreations(user.id);
      setCustomAds(ads);
    } catch (error) {
      console.error('Error loading custom ads:', error);
      addNotification('error', 'Load Failed', 'Failed to load custom ads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedAd || !newNote.trim() || !user?.id) return;

    try {
      setIsAddingNote(true);
      await CustomAdCreationService.addNote(
        selectedAd.id,
        user.id,
        newNote.trim(),
        'comment',
        false
      );
      setNewNote('');
      addNotification('success', 'Note Added', 'Note added successfully');
      loadCustomAds(); // Reload to get updated notes
      if (selectedAd) {
        const updatedAd = await CustomAdCreationService.getCustomAdCreation(selectedAd.id);
        setSelectedAd(updatedAd);
      }
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

  const filteredAds = customAds.filter(ad => filter === 'all' || ad.status === filter);

  if (loading) {
    return (
      <DashboardLayout
        title="Manage My Custom Ads"
        subtitle="Communicate with designers for proof and approval"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Manage My Custom Ads"
      subtitle="Communicate with designers for proof and approval"
    >
      <div className="space-y-6">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            onClick={loadCustomAds}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { key: 'all', label: 'All', count: customAds.length },
          { key: 'draft', label: 'Draft', count: customAds.filter(ad => ad.status === 'draft').length },
          { key: 'submitted', label: 'Submitted', count: customAds.filter(ad => ad.status === 'submitted').length },
          { key: 'in_review', label: 'In Review', count: customAds.filter(ad => ad.status === 'in_review').length },
          { key: 'approved', label: 'Approved', count: customAds.filter(ad => ad.status === 'approved').length },
          { key: 'rejected', label: 'Rejected', count: customAds.filter(ad => ad.status === 'rejected').length },
          { key: 'completed', label: 'Completed', count: customAds.filter(ad => ad.status === 'completed').length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white text-gray-900 dark:bg-gray-700 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ads List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Custom Ads ({filteredAds.length})
          </h2>
          
          {filteredAds.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No custom ads found for the selected filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAds.map((ad) => (
                <div
                  key={ad.id}
                  onClick={() => setSelectedAd(ad)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedAd?.id === ad.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {ad.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(ad.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ad.status)}`}>
                        {ad.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                    {ad.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                    <span>{ad.notes.length} notes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Ad Details */}
        <div className="lg:col-span-2">
          {selectedAd ? (
            <div className="space-y-6">
              {/* Ad Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedAd.title}
                  </h2>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedAd.status)}
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedAd.status)}`}>
                      {selectedAd.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {selectedAd.description || 'No description provided.'}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Created: {new Date(selectedAd.created_at).toLocaleDateString()}</span>
                  </div>
                  {selectedAd.deadline && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Deadline: {new Date(selectedAd.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedAd.budget_range && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span>{selectedAd.budget_range}</span>
                    </div>
                  )}
                  {selectedAd.category && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Palette className="w-4 h-4 mr-2" />
                      <span>{selectedAd.category}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Communication Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Communication with Designer
                  </h3>
                  <Button
                    onClick={() => setShowNotes(!showNotes)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    {showNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showNotes ? 'Hide' : 'Show'} Messages</span>
                  </Button>
                </div>

                {showNotes && (
                  <div className="space-y-4">
                    {/* Add Note Form */}
                    {selectedAd.status !== 'completed' && (
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Send Message to Designer
                        </h4>
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
                          placeholder="Ask questions, provide feedback, or request changes..."
                        />
                        <Button
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || isAddingNote}
                          size="sm"
                          className="flex items-center space-x-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isAddingNote ? 'Sending...' : 'Send Message'}</span>
                        </Button>
                      </div>
                    )}

                    {/* Messages List */}
                    {selectedAd.notes.length > 0 ? (
                      <div className="space-y-3">
                        {selectedAd.notes
                          .filter(note => !note.is_internal) // Only show client-visible notes
                          .map((note) => (
                            <div
                              key={note.id}
                              className={`border rounded-lg p-4 ${
                                note.note_type === 'comment' && note.user_id === user?.id
                                  ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
                                  : 'border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {note.note_type === 'comment' && note.user_id === user?.id
                                    ? 'You'
                                    : note.note_type === 'comment'
                                    ? 'Designer'
                                    : note.note_type === 'requirement' 
                                    ? 'Requirement'
                                    : note.note_type === 'feedback' 
                                    ? 'Designer Feedback'
                                    : note.note_type === 'approval' 
                                    ? 'Designer Approval'
                                    : note.note_type === 'rejection' 
                                    ? 'Designer Rejection'
                                    : 'System Message'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm">
                                {note.content}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          No messages yet. Start a conversation with your designer.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Media Files */}
              {selectedAd.media_files.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Media Files ({selectedAd.media_files.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAd.media_files.map((file) => (
                      <div
                        key={file.id}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">📁</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {file.original_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {file.mime_type?.includes('image') ? 'Image' : 
                                 file.mime_type?.includes('video') ? 'Video' : 'File'} • 
                                {Math.round(file.file_size / 1024)} KB
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a Custom Ad
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a custom ad from the list to view details and communicate with your designer.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
