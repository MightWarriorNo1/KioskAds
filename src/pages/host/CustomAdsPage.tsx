import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Camera, 
  Video, 
  Palette, 
  Upload, 
  Check, 
  X, 
  AlertCircle,
  MapPin,
  Clock,
  DollarSign,
  FileImage,
  FileVideo,
  Trash2,
  Eye,
  Plus,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { Elements, useElements, useStripe, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { BillingService } from '../../services/billingService';
import { CustomAdsService } from '../../services/customAdsService';
import { ProfileService } from '../../services/profileService';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import { PaymentMethod } from '../../types/database';
import { validateCustomAdFile } from '../../utils/customAdFileValidation';
import ProgressSteps from '../../components/shared/ProgressSteps';

interface ServiceTile {
  id: string;
  title: string;
  description: string;
  price: number;
  turnaround: string;
  icon: React.ReactNode;
  requiresLocation: boolean;
  timeLimit?: string;
  videoLength?: string;
}

interface OrderFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  details: string;
  files: File[];
  preferredDate: string;
  preferredTime: string;
}

const services: ServiceTile[] = [
  {
    id: 'vertical_ad_design',
    title: 'Vertical Ad Design',
    description: 'Professional vertical ad design optimized for digital kiosks',
    price: 125,
    turnaround: '5-day turnaround',
    icon: <Palette className="h-8 w-8" />,
    requiresLocation: false
  },
  {
    id: 'vertical_ad_with_upload',
    title: 'Vertical Ad with User Uploaded Files',
    description: 'Custom vertical ad using your provided assets and content',
    price: 125,
    turnaround: '5-day turnaround',
    icon: <Upload className="h-8 w-8" />,
    requiresLocation: false
  },
  {
    id: 'video_ad_creation',
    title: 'Video Ad Creation',
    description: 'Dynamic video advertisement for maximum engagement',
    price: 250,
    turnaround: '7-day turnaround',
    icon: <Video className="h-8 w-8" />,
    requiresLocation: false,
    videoLength: '15 sec - 30 sec video'
  }
];

export default function HostCustomAdsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceTile | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const { user } = useAuth();
  const [formData, setFormData] = useState<OrderFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    details: '',
    files: [],
    preferredDate: '',
    preferredTime: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<OrderFormData>>({});
  const [fileValidationErrors, setFileValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'form' | 'pay' | 'method' | 'success'>('form');
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedOrderProofs, setSubmittedOrderProofs] = useState<any[]>([]);
  const [isLoadingProofs, setIsLoadingProofs] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedProofForComments, setSelectedProofForComments] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const navigate=useNavigate();
  const location = useLocation();

  // Update form data when user changes
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          // Fetch user profile to get full_name from profiles table
          const profile = await ProfileService.getProfile(user.id);
          const fullName = profile?.full_name || user.name || '';
          const nameParts = fullName.split(' ');
          
          setFormData(prev => ({
            ...prev,
            firstName: nameParts[0] || prev.firstName,
            lastName: nameParts.slice(1).join(' ') || prev.lastName,
            email: user.email || prev.email,
          }));
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Fallback to user.name if profile fetch fails
          const nameParts = (user.name || '').split(' ');
          setFormData(prev => ({
            ...prev,
            firstName: nameParts[0] || prev.firstName,
            lastName: nameParts.slice(1).join(' ') || prev.lastName,
            email: user.email || prev.email,
          }));
        }
      }
    };
    
    loadUserProfile();
  }, [user]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

  const steps = [
    { number: 1, name: 'Choose Ad Type', current: currentStep === 1, completed: currentStep > 1 },
    { number: 2, name: 'Description & Details', current: currentStep === 2, completed: currentStep > 2 },
    { number: 3, name: 'File Upload', current: currentStep === 3, completed: currentStep > 3 },
    { number: 4, name: 'Review & Submit', current: currentStep === 4, completed: currentStep > 4 },
  ];

  // Load proofs for the just-submitted order so user can review/approve
  React.useEffect(() => {
    const loadProofs = async () => {
      if (!submittedOrderId) return;
      try {
        setIsLoadingProofs(true);
        const proofs = await CustomAdsService.getOrderProofs(submittedOrderId);
        setSubmittedOrderProofs(proofs || []);
      } catch (e) {
        console.error('Error loading proofs for submitted order:', e);
      } finally {
        setIsLoadingProofs(false);
      }
    };
    loadProofs();

    // Poll for new proofs for a short time after order submission (designer may upload soon)
    const interval = submittedOrderId ? setInterval(loadProofs, 15000) : undefined;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [submittedOrderId]);

  const handleApproveProof = async (proofId: string, comments?: string) => {
    try {
      await CustomAdsService.approveProof(proofId, comments);
      // Refresh proofs
      const proofs = await CustomAdsService.getOrderProofs(submittedOrderId!);
      setSubmittedOrderProofs(proofs || []);
    } catch (e) {
      console.error('Error approving proof:', e);
    }
  };

  const handleRejectProof = async (proofId: string, feedback: string) => {
    try {
      await CustomAdsService.rejectProof(proofId, feedback);
      // Refresh proofs
      const proofs = await CustomAdsService.getOrderProofs(submittedOrderId!);
      setSubmittedOrderProofs(proofs || []);
    } catch (e) {
      console.error('Error rejecting proof:', e);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedProofForComments) return;
    try {
      await CustomAdsService.addComment(submittedOrderId!, commentText, user?.id!);
      setCommentText('');
      setShowCommentsModal(false);
      setSelectedProofForComments(null);
      // Refresh proofs
      const proofs = await CustomAdsService.getOrderProofs(submittedOrderId!);
      setSubmittedOrderProofs(proofs || []);
    } catch (e) {
      console.error('Error adding comment:', e);
    }
  };

  const handleInputChange = (field: keyof OrderFormData, value: string | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...formData.files, ...files];
    setFormData(prev => ({ ...prev, files: newFiles }));
    
    // Validate files
    const errors: string[] = [];
    newFiles.forEach((file, index) => {
      const validation = validateCustomAdFile(file);
      if (!validation.isValid) {
        errors.push(`File ${index + 1}: ${validation.error}`);
      }
    });
    setFileValidationErrors(errors);
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<OrderFormData> = {};

    // Required fields: first name, last name, email, phone, details
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.details.trim()) errors.details = 'Project details are required';
    
    // Address is now optional - no validation required
    // Date and time are now optional for all services - no validation required
    
    // Note: Files are optional - no validation for uploads

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsUploading(true);
    
    try {
      if (!selectedService || !user) throw new Error('No service selected or user not authenticated');
      
      // Upload files if any
      const uploadedFiles: any[] = [];
      for (const file of formData.files) {
        const uploadedFile = await CustomAdsService.uploadFiles(user.id, [file]);
        uploadedFiles.push(...uploadedFile);
      }

      setFormData(prev => ({ ...prev, files: uploadedFiles }));

      // Load payment methods and show payment method selection
      await loadPaymentMethods();
      setPaymentStep('method');
    } catch (error) {
      alert('Error submitting order. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentMethodSelect = (methodId: string | null) => {
    setSelectedPaymentMethodId(methodId);
  };

  const handleAddNewMethod = async () => {
    // This would open a modal to add a new payment method
    // For now, we'll just show an alert
    alert('Add new payment method functionality would be implemented here');
  };

  const loadPaymentMethods = async () => {
    if (!user?.id) return;
    
    setIsLoadingPaymentMethods(true);
    try {
      const methods = await BillingService.getPaymentMethods(user.id);
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedService || !user) return;
    
    try {
      setIsUploading(true);
      
      // Create payment intent
      const intent = await BillingService.createPaymentIntent({
        amount: Math.round(selectedService.price * 100),
        currency: 'usd',
        metadata: {
          purpose: 'custom_ad_order',
          user_id: user.id,
          service: selectedService.id
        }
      });

      if (!intent?.clientSecret) {
        throw new Error('Unable to create payment intent');
      }

      setClientSecret(intent.clientSecret);
      setPaymentStep('pay');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!selectedService || !user) return;
    
    try {
      setIsUploading(true);
      
      // Create the order
      const order = await CustomAdsService.createOrder({
        user_id: user.id,
        service_key: selectedService.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        details: formData.details,
        files: formData.files.map(f => ({
          name: f.name,
          url: '', // Will be set after upload
          size: f.size,
          type: f.type
        })),
        total_amount: selectedService.price,
        payment_status: 'succeeded',
        workflow_status: 'submitted',
        priority: 'normal'
      });

      setSubmittedOrderId(order.id);
      setOrderSubmitted(true);
      setPaymentStep('success');
      setPaymentMessage('Order submitted successfully!');
    } catch (error) {
      console.error('Order creation error:', error);
      alert('Order creation failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render content based on portal context
  const content = (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Create Custom Ad
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Professional design services for your digital kiosk campaigns
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-12">
        <ProgressSteps steps={steps} currentStep={currentStep} />
      </div>

      {/* Service Selection */}
      {currentStep === 1 && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your Service
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Select the type of custom ad service that best fits your needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <Card
                key={service.id}
                className={`p-8 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedService?.id === service.id
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedService(service)}
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {service.description}
                  </p>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ${service.price}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {service.turnaround}
                    </div>
                    {service.videoLength && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {service.videoLength}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {selectedService && (
            <div className="text-center">
              <Button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3"
              >
                Continue with {selectedService.title}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Description & Details Step */}
      {currentStep === 2 && selectedService && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Description & Details
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Tell us about your project requirements and preferences
            </p>
          </div>

          <Card className="max-w-4xl mx-auto">
            <div className="p-8">
              {/* Selected Service Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedService.icon}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{selectedService.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedService.turnaround} • ${selectedService.price}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setCurrentStep(3); }} className="space-y-6">
                {/* Personal Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    error={formErrors.firstName}
                    required
                    disabled
                    className="bg-gray-100 dark:bg-gray-700"
                  />
                  <Input
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    error={formErrors.lastName}
                    required
                    disabled
                    className="bg-gray-100 dark:bg-gray-700"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={formErrors.email}
                    required
                    disabled
                    className="bg-gray-100 dark:bg-gray-700"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    error={formErrors.phone}
                    required
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Address (Optional)"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter your address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Details *
                  </label>
                  <textarea
                    value={formData.details}
                    onChange={(e) => handleInputChange('details', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe how you want your ad to look and any specific requirements..."
                    required
                  />
                  {formErrors.details && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.details}</p>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCurrentStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="px-8 py-3"
                  >
                    Continue to File Upload
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* File Upload Step */}
      {currentStep === 3 && selectedService && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              File Upload
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Upload any media assets or reference materials for your project
            </p>
          </div>

          <Card className="max-w-4xl mx-auto">
            <div className="p-8">
              {/* Selected Service Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedService.icon}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{selectedService.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedService.turnaround} • ${selectedService.price}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Media Assets (Max 20 files)
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Any dimensions allowed • Images up to 100MB • Videos up to 5 minutes • Many common document types supported
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {formData.files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex items-center space-x-2">
                            {file.type.startsWith('image/') ? (
                              <FileImage className="h-4 w-4 text-blue-500" />
                            ) : file.type.startsWith('video/') ? (
                              <FileVideo className="h-4 w-4 text-purple-500" />
                            ) : (
                              <FileImage className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {file.name} ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {fileValidationErrors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {fileValidationErrors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">{error}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCurrentStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(4)}
                    className="px-8 py-3"
                  >
                    Continue to Review
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Review & Submit Step */}
      {currentStep === 4 && selectedService && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Review & Submit
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Review your order details and submit your custom ad request
            </p>
          </div>

          <Card className="max-w-4xl mx-auto">
            <div className="p-8">
              {/* Order Summary */}
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
                  
                  {/* Service Details */}
                  <div className="flex items-center gap-3 mb-4">
                    {selectedService.icon}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{selectedService.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedService.turnaround} • ${selectedService.price}
                      </p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                      <p className="text-gray-900 dark:text-white">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                      <p className="text-gray-900 dark:text-white">{formData.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="text-gray-900 dark:text-white">{formData.phone}</p>
                    </div>
                    {formData.address && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                        <p className="text-gray-900 dark:text-white">{formData.address}</p>
                      </div>
                    )}
                  </div>

                  {/* Project Details */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Project Details</label>
                    <p className="text-gray-900 dark:text-white mt-1">{formData.details}</p>
                  </div>

                  {/* Uploaded Files */}
                  {formData.files.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Uploaded Files</label>
                      <div className="mt-2 space-y-2">
                        {formData.files.map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                            {file.type.startsWith('image/') ? (
                              <FileImage className="h-4 w-4 text-blue-500" />
                            ) : file.type.startsWith('video/') ? (
                              <FileVideo className="h-4 w-4 text-purple-500" />
                            ) : (
                              <FileImage className="h-4 w-4 text-gray-500" />
                            )}
                            <span>{file.name} ({formatFileSize(file.size)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${selectedService.price}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep(3)}
                >
                  Back
                </Button>
                <Button
                  onClick={() => setShowOrderForm(true)}
                  className="px-8 py-3"
                >
                  Submit Order
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Order Form */}
      {showOrderForm && selectedService && (
        <Card className="max-w-4xl mx-auto">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Order Details</h2>
              <Button 
                onClick={() => {
                  setShowOrderForm(false);
                  setSelectedService(null);
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    address: '',
                    details: '',
                    files: [],
                    preferredDate: '',
                    preferredTime: ''
                  });
                  setFormErrors({});
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Selected Service Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedService.icon}
                  <div>
                    <h3 className="font-semibold">{selectedService.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedService.turnaround} • ${selectedService.price}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {paymentStep === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    error={formErrors.firstName}
                    required
                    disabled
                    className="bg-gray-100 dark:bg-gray-700"
                  />
                  <Input
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    error={formErrors.lastName}
                    required
                    disabled
                    className="bg-gray-100 dark:bg-gray-700"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={formErrors.email}
                    required
                    disabled
                    className="bg-gray-100 dark:bg-gray-700"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    error={formErrors.phone}
                    required
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Address (Optional)"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter your address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Details *
                  </label>
                  <textarea
                    value={formData.details}
                    onChange={(e) => handleInputChange('details', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe how you want your ad to look and any specific requirements..."
                    required
                  />
                  {formErrors.details && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.details}</p>
                  )}
                </div>

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Media Assets (Max 20 files)
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Any dimensions allowed • Images up to 100MB • Videos up to 5 minutes • Many common document types supported
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {formData.files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex items-center space-x-2">
                            {file.type.startsWith('image/') ? (
                              <FileImage className="h-4 w-4 text-blue-500" />
                            ) : file.type.startsWith('video/') ? (
                              <FileVideo className="h-4 w-4 text-purple-500" />
                            ) : (
                              <FileImage className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {file.name} ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {fileValidationErrors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {fileValidationErrors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">{error}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowOrderForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="flex items-center space-x-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Payment</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Payment Method Selection */}
            {paymentStep === 'method' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Select Payment Method</h3>
                <PaymentMethodSelector
                  paymentMethods={paymentMethods}
                  selectedMethodId={selectedPaymentMethodId}
                  onSelectMethod={handlePaymentMethodSelect}
                  onAddNewMethod={handleAddNewMethod}
                  isLoading={isLoadingPaymentMethods}
                />
                <div className="flex justify-end space-x-4">
                  <Button
                    variant="secondary"
                    onClick={() => setPaymentStep('form')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={!selectedPaymentMethodId || isUploading}
                  >
                    {isUploading ? 'Processing...' : 'Pay Now'}
                  </Button>
                </div>
              </div>
            )}

            {/* Payment Processing */}
            {paymentStep === 'pay' && clientSecret && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Complete Payment</h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Amount: ${selectedService.price}
                  </p>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentForm onSuccess={handlePaymentSuccess} />
                  </Elements>
                </div>
              </div>
            )}

            {/* Success Message */}
            {paymentStep === 'success' && (
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Order Submitted Successfully!
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Your custom ad order has been submitted. Our design team will review your requirements and get started on your project.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={() => {
                      setShowOrderForm(false);
                      setSelectedService(null);
                      setPaymentStep('form');
                      setOrderSubmitted(false);
                      setSubmittedOrderId(null);
                    }}
                  >
                    Create Another Order
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/host/manage-custom-ads')}
                  >
                    View My Orders
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Order Submitted Successfully */}
      {orderSubmitted && submittedOrderId && (
        <Card className="max-w-4xl mx-auto">
          <div className="p-8">
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Order Submitted Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your custom ad order has been submitted. Our design team will review your requirements and get started on your project.
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => {
                    setOrderSubmitted(false);
                    setSubmittedOrderId(null);
                    setShowOrderForm(false);
                    setSelectedService(null);
                    setPaymentStep('form');
                  }}
                >
                  Create Another Order
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/host/manage-custom-ads')}
                >
                  View My Orders
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  return content;
}

// Payment Form Component
function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/host/custom-ads',
      },
    });

    if (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } else {
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}
