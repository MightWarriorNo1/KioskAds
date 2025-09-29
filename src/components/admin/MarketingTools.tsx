import { useState, useEffect } from 'react';
import { Megaphone, Plus, Edit, Trash2, Eye, EyeOff, RefreshCw, Star, MessageSquare, Bell, BarChart3 } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService, MarketingTool, Testimonial } from '../../services/adminService';

export default function MarketingTools() {
  const [marketingTools, setMarketingTools] = useState<MarketingTool[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tools' | 'testimonials'>('tools');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketingTool | Testimonial | null>(null);
  const { addNotification } = useNotification();

  // Form state
  const [formData, setFormData] = useState({
    type: 'announcement_bar' as 'announcement_bar' | 'popup' | 'testimonial' | 'sales_notification',
    title: '',
    content: '',
    settings: {
      position: 'top',
      backgroundColor: '',
      textColor: '',
      cta: { label: '', href: '' },
      collectEmail: false
    } as any,
    is_active: true,
    priority: 0,
    target_audience: {},
    start_date: '',
    end_date: '',
    // Testimonial specific
    client_name: '',
    client_company: '',
    client_avatar_url: '',
    rating: 5,
    is_featured: false,
    display_order: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [toolsData, testimonialsData] = await Promise.all([
        AdminService.getMarketingTools(),
        AdminService.getTestimonials()
      ]);
      setMarketingTools(toolsData);
      setTestimonials(testimonialsData);
    } catch (error) {
      console.error('Error loading marketing data:', error);
      addNotification('error', 'Error', 'Failed to load marketing data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (activeTab === 'testimonials') {
        // Handle testimonial creation
        const testimonialData = {
          client_name: formData.client_name,
          client_company: formData.client_company,
          client_avatar_url: formData.client_avatar_url,
          content: formData.content,
          rating: formData.rating,
          is_featured: formData.is_featured,
          display_order: formData.display_order,
          is_active: formData.is_active
        };
        await AdminService.createTestimonial(testimonialData);
        addNotification('success', 'Testimonial Created', 'New testimonial has been created successfully');
      } else {
        // Handle marketing tool creation
        const toolData = {
          type: formData.type,
          title: formData.title,
          content: formData.content,
          settings: formData.settings,
          is_active: formData.is_active,
          priority: formData.priority,
          target_audience: formData.target_audience,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null
        };
        await AdminService.createMarketingTool(toolData);
        addNotification('success', 'Marketing Tool Created', 'New marketing tool has been created successfully');
      }
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating item:', error);
      addNotification('error', 'Error', 'Failed to create item');
    }
  };

  const handleUpdate = async () => {
    try {
      if (!editingItem) return;

      if (activeTab === 'testimonials') {
        // Handle testimonial update
        const testimonialData = {
          client_name: formData.client_name,
          client_company: formData.client_company,
          client_avatar_url: formData.client_avatar_url,
          content: formData.content,
          rating: formData.rating,
          is_featured: formData.is_featured,
          display_order: formData.display_order,
          is_active: formData.is_active
        };
        await AdminService.updateTestimonial(editingItem.id, testimonialData);
        addNotification('success', 'Testimonial Updated', 'Testimonial has been updated successfully');
      } else {
        // Handle marketing tool update
        const toolData = {
          type: formData.type,
          title: formData.title,
          content: formData.content,
          settings: formData.settings,
          is_active: formData.is_active,
          priority: formData.priority,
          target_audience: formData.target_audience,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null
        };
        await AdminService.updateMarketingTool(editingItem.id, toolData);
        addNotification('success', 'Marketing Tool Updated', 'Marketing tool has been updated successfully');
      }
      setEditingItem(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error updating item:', error);
      addNotification('error', 'Error', 'Failed to update item');
    }
  };

  const handleEdit = (item: MarketingTool | Testimonial) => {
    setEditingItem(item);
    setFormData({
      type: 'type' in item ? item.type : 'announcement_bar',
      title: item.title || '',
      content: item.content || '',
      settings: 'settings' in item ? (item as any).settings || {
        position: 'top',
        backgroundColor: '',
        textColor: '',
        cta: { label: '', href: '' },
        collectEmail: false
      } : {},
      is_active: item.is_active,
      priority: 'priority' in item ? item.priority : 0,
      target_audience: 'target_audience' in item ? item.target_audience : {},
      start_date: 'start_date' in item ? item.start_date || '' : '',
      end_date: 'end_date' in item ? item.end_date || '' : '',
      client_name: 'client_name' in item ? item.client_name || '' : '',
      client_company: 'client_company' in item ? item.client_company || '' : '',
      client_avatar_url: 'client_avatar_url' in item ? item.client_avatar_url || '' : '',
      rating: 'rating' in item ? item.rating || 5 : 5,
      is_featured: 'is_featured' in item ? item.is_featured : false,
      display_order: 'display_order' in item ? item.display_order : 0
    });
  };

  const handleDelete = async (item: MarketingTool | Testimonial) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      if (activeTab === 'testimonials') {
        await AdminService.deleteTestimonial(item.id);
        addNotification('success', 'Testimonial Deleted', 'Testimonial has been deleted successfully');
      } else {
        await AdminService.deleteMarketingTool(item.id);
        addNotification('success', 'Marketing Tool Deleted', 'Marketing tool has been deleted successfully');
      }
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      addNotification('error', 'Error', 'Failed to delete item');
    }
  };

  const handleToggleActive = async (item: MarketingTool | Testimonial) => {
    try {
      const newStatus = !item.is_active;
      const action = newStatus ? 'activated' : 'deactivated';
      
      if (activeTab === 'testimonials') {
        await AdminService.updateTestimonial(item.id, { is_active: newStatus });
        addNotification('success', 'Testimonial Updated', `Testimonial has been ${action} successfully`);
      } else {
        await AdminService.updateMarketingTool(item.id, { is_active: newStatus });
        addNotification('success', 'Marketing Tool Updated', `Marketing tool has been ${action} successfully`);
      }
      loadData();
    } catch (error) {
      console.error('Error toggling active status:', error);
      addNotification('error', 'Error', 'Failed to update item status');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'announcement_bar',
      title: '',
      content: '',
      settings: {
        position: 'top',
        backgroundColor: '',
        textColor: '',
        cta: { label: '', href: '' },
        collectEmail: false
      } as any,
      is_active: true,
      priority: 0,
      target_audience: {},
      start_date: '',
      end_date: '',
      client_name: '',
      client_company: '',
      client_avatar_url: '',
      rating: 5,
      is_featured: false,
      display_order: 0
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement_bar': return BarChart3;
      case 'popup': return MessageSquare;
      case 'sales_notification': return Bell;
      case 'testimonial': return Star;
      default: return Megaphone;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement_bar': return 'bg-blue-100 text-blue-800';
      case 'popup': return 'bg-purple-100 text-purple-800';
      case 'sales_notification': return 'bg-green-100 text-green-800';
      case 'testimonial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Marketing Tools</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage announcement bars, popups, testimonials, and sales notifications</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create {activeTab === 'testimonials' ? 'Testimonial' : 'Tool'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('tools')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tools'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Marketing Tools
            </button>
            <button
              onClick={() => setActiveTab('testimonials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'testimonials'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Testimonials
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'tools' ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Marketing Tools</h3>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading marketing tools...</p>
                </div>
              ) : marketingTools.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No marketing tools</h3>
                  <p className="text-gray-500 dark:text-gray-400">Create your first marketing tool to get started.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {marketingTools.map((tool) => {
                    const TypeIcon = getTypeIcon(tool.type);
                    return (
                      <div key={tool.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <TypeIcon className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{tool.title}</h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(tool.type)}`}>
                                  {tool.type.replace('_', ' ')}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  tool.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {tool.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Priority: {tool.priority}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleToggleActive(tool)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title={tool.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {tool.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                            <button 
                              onClick={() => handleEdit(tool)}
                              className="p-2 text-purple-600 hover:text-purple-800"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(tool)}
                              className="p-2 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{tool.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Testimonials</h3>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading testimonials...</p>
                </div>
              ) : testimonials.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No testimonials</h3>
                  <p className="text-gray-500 dark:text-gray-400">Create your first testimonial to showcase customer feedback.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {testimonials.map((testimonial) => (
                    <div key={testimonial.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                            {testimonial.client_avatar_url ? (
                              <img 
                                src={testimonial.client_avatar_url} 
                                alt={testimonial.client_name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-medium text-lg">
                                {testimonial.client_name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">{testimonial.client_name}</h4>
                            {testimonial.client_company && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.client_company}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4 w-4 ${
                                      i < (testimonial.rating || 0) 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                    }`} 
                                  />
                                ))}
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                testimonial.is_featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {testimonial.is_featured ? 'Featured' : 'Regular'}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                testimonial.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {testimonial.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleToggleActive(testimonial)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title={testimonial.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {testimonial.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={() => handleEdit(testimonial)}
                            className="p-2 text-purple-600 hover:text-purple-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(testimonial)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">"{testimonial.content}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Edit' : 'Create'} {activeTab === 'testimonials' ? 'Testimonial' : 'Marketing Tool'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <EyeOff className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {activeTab === 'testimonials' ? (
                // Testimonial form
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Name</label>
                      <input
                        type="text"
                        value={formData.client_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company (Optional)</label>
                      <input
                        type="text"
                        value={formData.client_company}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_company: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar URL (Optional)</label>
                    <input
                      type="url"
                      value={formData.client_avatar_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_avatar_url: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Testimonial Content</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={4}
                      placeholder="Share your experience with our platform..."
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
                      <select
                        value={formData.rating}
                        onChange={(e) => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {[1, 2, 3, 4, 5].map(rating => (
                          <option key={rating} value={rating}>{rating} Star{rating > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_order: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_featured}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900 dark:text-white">Featured</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900 dark:text-white">Active</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                // Marketing tool form
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="announcement_bar">Announcement Bar</option>
                        <option value="popup">Popup</option>
                        <option value="sales_notification">Sales Notification</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                      <input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={4}
                      placeholder="Enter content..."
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Active (tool is visible to users)
                    </label>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingItem ? handleUpdate : handleCreate}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingItem ? 'Update' : 'Create'} {activeTab === 'testimonials' ? 'Testimonial' : 'Tool'}
                </button>
              </div>
              {formData.type === 'announcement_bar' && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position</label>
                      <select
                        value={(formData.settings as any).position || 'top'}
                        onChange={(e) => setFormData(prev => ({ ...prev, settings: { ...(prev.settings as any), position: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Background Color</label>
                      <input
                        type="text"
                        value={(formData.settings as any).backgroundColor || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, settings: { ...(prev.settings as any), backgroundColor: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="#4f46e5 or rgb(79 70 229)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Color</label>
                      <input
                        type="text"
                        value={(formData.settings as any).textColor || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, settings: { ...(prev.settings as any), textColor: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="#ffffff or white"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="collectEmail"
                        checked={Boolean((formData.settings as any).collectEmail)}
                        onChange={(e) => setFormData(prev => ({ ...prev, settings: { ...(prev.settings as any), collectEmail: e.target.checked } }))}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor="collectEmail" className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Collect Email Instead of Button
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Button Label</label>
                        <input
                          type="text"
                          value={(formData.settings as any).cta?.label || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, settings: { ...(prev.settings as any), cta: { ...((prev.settings as any).cta || {}), label: e.target.value } } }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Get Started"
                          disabled={Boolean((formData.settings as any).collectEmail)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Button Link</label>
                        <input
                          type="url"
                          value={(formData.settings as any).cta?.href || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, settings: { ...(prev.settings as any), cta: { ...((prev.settings as any).cta || {}), href: e.target.value } } }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="https://example.com/signup"
                          disabled={Boolean((formData.settings as any).collectEmail)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
