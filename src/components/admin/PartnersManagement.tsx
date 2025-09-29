import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, MapPin, Image as ImageIcon, ExternalLink, Save, X, Upload } from 'lucide-react';
import { PartnersService, Partner, CreatePartnerData, UpdatePartnerData } from '../../services/partnersService';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabaseClient';

export default function PartnersManagement() {
  const { addNotification } = useNotification();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState<CreatePartnerData>({
    title: '',
    address: '',
    photo_url: '',
    logo_url: '',
    kiosk_map_url: '',
    coordinates: undefined,
    description: '',
    website_url: '',
    contact_email: '',
    contact_phone: '',
    display_order: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const partnersData = await PartnersService.getAllPartners();
      setPartners(partnersData);
    } catch (error) {
      console.error('Error loading partners:', error);
      addNotification('error', 'Error', 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address';
    }

    if (formData.website_url && !/^https?:\/\/.+/.test(formData.website_url)) {
      newErrors.website_url = 'Please enter a valid URL (starting with http:// or https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreatePartner = async () => {
    if (!validateForm()) {
      addNotification('error', 'Validation Error', 'Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);
      await PartnersService.createPartner(formData);
      addNotification('success', 'Success', 'Partner created successfully');
      setShowCreateModal(false);
      resetForm();
      loadPartners();
    } catch (error) {
      console.error('Error creating partner:', error);
      addNotification('error', 'Error', 'Failed to create partner');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPartner = async () => {
    if (!selectedPartner || !validateForm()) {
      addNotification('error', 'Validation Error', 'Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);
      const updateData: UpdatePartnerData = { ...formData };
      await PartnersService.updatePartner(selectedPartner.id, updateData);
      addNotification('success', 'Success', 'Partner updated successfully');
      setShowEditModal(false);
      resetForm();
      loadPartners();
    } catch (error) {
      console.error('Error updating partner:', error);
      addNotification('error', 'Error', 'Failed to update partner');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!selectedPartner) return;

    try {
      setSaving(true);
      await PartnersService.deletePartner(selectedPartner.id);
      addNotification('success', 'Success', 'Partner deleted successfully');
      setShowDeleteModal(false);
      setSelectedPartner(null);
      loadPartners();
    } catch (error) {
      console.error('Error deleting partner:', error);
      addNotification('error', 'Error', 'Failed to delete partner');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (partner: Partner) => {
    try {
      await PartnersService.togglePartnerStatus(partner.id, !partner.is_active);
      addNotification('success', 'Success', `Partner ${partner.is_active ? 'deactivated' : 'activated'} successfully`);
      loadPartners();
    } catch (error) {
      console.error('Error toggling partner status:', error);
      addNotification('error', 'Error', 'Failed to update partner status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      address: '',
      photo_url: '',
      logo_url: '',
      kiosk_map_url: '',
      coordinates: undefined,
      description: '',
      website_url: '',
      contact_email: '',
      contact_phone: '',
      display_order: 0
    });
    setErrors({});
  };

  const openEditModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      title: partner.title,
      address: partner.address,
      photo_url: partner.photo_url || '',
      logo_url: (partner as any).logo_url || '',
      kiosk_map_url: partner.kiosk_map_url || '',
      coordinates: partner.coordinates,
      description: partner.description || '',
      website_url: partner.website_url || '',
      contact_email: partner.contact_email || '',
      contact_phone: partner.contact_phone || '',
      display_order: partner.display_order
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setShowDeleteModal(true);
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && partner.is_active) ||
                         (statusFilter === 'inactive' && !partner.is_active);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Partners Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage partner locations and information</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map((partner) => (
          <div key={partner.id} className="card p-6">
            {/* Partner Image */}
            {partner.photo_url && (
              <div className="relative mb-4 rounded-lg overflow-hidden">
                <img
                  src={partner.photo_url}
                  alt={partner.title}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    partner.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {partner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}

            {/* Partner Info */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {partner.title}
              </h3>
              
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{partner.address}</span>
              </div>

              {partner.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {partner.description}
                </p>
              )}

              {/* Contact Info */}
              <div className="space-y-1">
                {partner.contact_email && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {partner.contact_email}
                  </p>
                )}
                {partner.contact_phone && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {partner.contact_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(partner)}
                  className={`p-2 rounded-lg transition-colors ${
                    partner.is_active
                      ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                      : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                  title={partner.is_active ? 'Deactivate' : 'Activate'}
                >
                  {partner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEditModal(partner)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDeleteModal(partner)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Order: {partner.display_order}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredPartners.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No partners found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first partner'
            }
          </p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <PartnerModal
          title="Create Partner"
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          saving={saving}
          onSave={handleCreatePartner}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPartner && (
        <PartnerModal
          title="Edit Partner"
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          saving={saving}
          onSave={handleEditPartner}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
          }}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Partner
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{selectedPartner.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePartner}
                className="btn-danger"
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PartnerModalProps {
  title: string;
  formData: CreatePartnerData;
  setFormData: (data: CreatePartnerData) => void;
  errors: Record<string, string>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

function PartnerModal({ title, formData, setFormData, errors, saving, onSave, onClose }: PartnerModalProps) {
  const handleInputChange = (field: keyof CreatePartnerData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCoordinatesChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData(prev => ({
        ...prev,
        coordinates: {
          ...prev.coordinates,
          [field]: numValue
        } as { lat: number; lng: number }
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Logo (transparent on white) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Partner Logo (transparent, shown on white background)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                value={formData.logo_url || ''}
                onChange={(e) => handleInputChange('logo_url', e.target.value)}
                className="input-field flex-1"
                placeholder="https://example.com/logo.png"
              />
              <label className="btn-secondary cursor-pointer">
                <Upload className="w-4 h-4 inline mr-2" /> Upload
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
                      const path = `partners/logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from('media-assets')
                        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
                      if (uploadError) throw uploadError;
                      const { data: pub } = supabase.storage.from('media-assets').getPublicUrl(path);
                      setFormData({ ...formData, logo_url: pub.publicUrl });
                    } catch (err) {
                      console.error('Logo upload failed', err);
                    }
                  }}
                />
              </label>
            </div>
            {formData.logo_url && (
              <div className="mt-2 p-4 bg-white border rounded flex items-center justify-center">
                <img src={formData.logo_url} alt="Logo preview" className="max-h-16 object-contain" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Use transparent PNG/WEBP/SVG. Rendered against white.</p>
          </div>
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`input-field ${errors.title ? 'border-red-500' : ''}`}
              placeholder="Partner name or business title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className={`input-field ${errors.address ? 'border-red-500' : ''}`}
              placeholder="Full address including city, state, zip"
              rows={3}
            />
            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
          </div>

          {/* Photo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Photo URL
            </label>
            <input
              type="url"
              value={formData.photo_url}
              onChange={(e) => handleInputChange('photo_url', e.target.value)}
              className="input-field"
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          {/* Kiosk Map URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kiosk Map URL
            </label>
            <input
              type="url"
              value={formData.kiosk_map_url}
              onChange={(e) => handleInputChange('kiosk_map_url', e.target.value)}
              className="input-field"
              placeholder="https://example.com/map.jpg"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.coordinates?.lat || ''}
                onChange={(e) => handleCoordinatesChange('lat', e.target.value)}
                className="input-field"
                placeholder="40.7128"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.coordinates?.lng || ''}
                onChange={(e) => handleCoordinatesChange('lng', e.target.value)}
                className="input-field"
                placeholder="-74.0060"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="input-field"
              placeholder="Brief description of the partner or location"
              rows={3}
            />
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={formData.website_url}
              onChange={(e) => handleInputChange('website_url', e.target.value)}
              className={`input-field ${errors.website_url ? 'border-red-500' : ''}`}
              placeholder="https://example.com"
            />
            {errors.website_url && <p className="text-red-500 text-sm mt-1">{errors.website_url}</p>}
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              className={`input-field ${errors.contact_email ? 'border-red-500' : ''}`}
              placeholder="contact@example.com"
            />
            {errors.contact_email && <p className="text-red-500 text-sm mt-1">{errors.contact_email}</p>}
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => handleInputChange('contact_phone', e.target.value)}
              className="input-field"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
              className="input-field"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
