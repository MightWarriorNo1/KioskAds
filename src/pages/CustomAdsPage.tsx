import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  CheckCircle
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { Elements, useElements, useStripe, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { BillingService } from '../services/billingService';
import { CustomAdsService } from '../services/customAdsService';
import { ProfileService } from '../services/profileService';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import { PaymentMethod } from '../types/database';
import { validateCustomAdFile } from '../utils/customAdFileValidation';
import ProgressSteps from '../components/shared/ProgressSteps';

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
  preferredDate?: string;
  preferredTime?: string;
}

const services: ServiceTile[] = [
  {
    id: 'graphic-design',
    title: 'Vertical Ad with User Uploaded Files',
    description: 'Custom graphic design using your provided assets',
    price: 125,
    turnaround: '5-day turnaround',
    icon: <Palette className="w-8 h-8" />,
    requiresLocation: false
  },
  {
    id: 'photography',
    title: 'Vertical Ad with Custom Photography',
    description: 'Professional photography session for your ad',
    price: 199,
    turnaround: '5-day turnaround',
    icon: <Camera className="w-8 h-8" />,
    requiresLocation: true,
    timeLimit: '2hr time limit'
  },
  {
    id: 'videography',
    title: 'Vertical Ad with Custom Video',
    description: 'Professional video production for your ad',
    price: 399,
    turnaround: '7-day turnaround',
    icon: <Video className="w-8 h-8" />,
    requiresLocation: true,
    timeLimit: '3hr time limit',
    videoLength: '15 sec - 30 sec video'
  }
];

export default function CustomAdsPage() {
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
    { number: 1, name: 'Service Selection', current: currentStep === 1, completed: currentStep > 1 },
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
      if (submittedOrderId) {
        const proofs = await CustomAdsService.getOrderProofs(submittedOrderId);
        setSubmittedOrderProofs(proofs || []);
      }
      alert('Approved! You can now create a campaign.');
    } catch (e) {
      console.error(e);
      alert('Failed to approve proof.');
    }
  };

  const handleRequestEdits = async (proofId: string, feedback: string) => {
    try {
      await CustomAdsService.rejectProof(proofId, feedback);
      if (submittedOrderId) {
        const proofs = await CustomAdsService.getOrderProofs(submittedOrderId);
        setSubmittedOrderProofs(proofs || []);
      }
      alert('Revision requested. Designer will be notified.');
    } catch (e) {
      console.error(e);
      alert('Failed to request edits.');
    }
  };

  const openCommentsModal = (proof: any, action: 'approve' | 'reject') => {
    setSelectedProofForComments({ ...proof, action });
    setCommentText('');
    setShowCommentsModal(true);
  };

  const handleSubmitComments = async () => {
    if (!selectedProofForComments) return;
    
    if (selectedProofForComments.action === 'approve') {
      await handleApproveProof(selectedProofForComments.id, commentText);
    } else {
      if (!commentText.trim()) {
        alert('Please provide feedback for the designer.');
        return;
      }
      await handleRequestEdits(selectedProofForComments.id, commentText);
    }
    
    setShowCommentsModal(false);
    setSelectedProofForComments(null);
    setCommentText('');
  };

  // Determine which portal we're in based on the current path
  const isHostPortal = location.pathname.startsWith('/host');
  const isClientPortal = location.pathname.startsWith('/client');

  const loadPaymentMethods = async () => {
    if (!user) return;
    
    setIsLoadingPaymentMethods(true);
    try {
      const methods = await BillingService.getPaymentMethods(user.id);
      setPaymentMethods(methods);
      
      // Set default payment method if available
      const defaultMethod = methods.find(m => m.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handleServiceSelect = (service: ServiceTile) => {
    if (!user) {
      navigate('/signin');
      return;
    }
    setSelectedService(service);
    if (service.requiresLocation) {
      setShowDisclaimer(true);
    } else {
      setCurrentStep(2);
      setShowOrderForm(true);
    }
  };


  const handleStartOver = () => {
    setCurrentStep(1);
    setSelectedService(null);
    setShowOrderForm(false);
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
    setFileValidationErrors([]);
    setOrderSubmitted(false);
    setSubmittedOrderId(null);
  };

  const handleDisclaimerConfirm = () => {
    setShowDisclaimer(false);
    setCurrentStep(2);
    setShowOrderForm(true);
  };

  const handleDisclaimerCancel = () => {
    setShowDisclaimer(false);
    setSelectedService(null);
  };

  const handleInputChange = (field: keyof OrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Handle address autocomplete
    if (field === 'address' && value.length > 2) {
      handleAddressAutocomplete(value);
    } else if (field === 'address' && value.length <= 2) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    }
  };

  const handleAddressAutocomplete = async (query: string) => {
    if (query.length < 3) return;
    
    setIsLoadingAddress(true);
    try {
      // Using a free geocoding service (you can replace with Google Places API or similar)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      
      const suggestions = data.map((item: any) => item.display_name);
      setAddressSuggestions(suggestions);
      setShowAddressSuggestions(true);
    } catch (error) {
      console.error('Address autocomplete error:', error);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const selectAddressSuggestion = (address: string) => {
    setFormData(prev => ({ ...prev, address }));
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxFiles = 20;

    if (files.length + formData.files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Clear previous validation errors
    setFileValidationErrors([]);

    for (const file of files) {
      try {
        // Use custom-ad validation: allow any dimensions and broad types
        const validation = await validateCustomAdFile(file, { allowAnyDimensions: true });
        
        if (!validation.isValid) {
          const errorMessage = `${file.name}: ${validation.errors.join(', ')}`;
          errors.push(errorMessage);
          continue;
        }
        
        validFiles.push(file);
      } catch (error) {
        console.error('Validation error for file:', file.name, error);
        const errorMessage = `${file.name}: Failed to validate file`;
        errors.push(errorMessage);
        continue;
      }
    }

    // Set validation errors for display
    setFileValidationErrors(errors);

    if (errors.length > 0) {
      // Show notification for validation errors
      const errorMessage = errors.length === 1 ? errors[0] : `${errors.length} files failed validation`;
      alert(errorMessage);
    }

    if (validFiles.length > 0) {
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...validFiles]
      }));
    }
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
    if (!selectedService || !user) return;
    
    setSelectedPaymentMethodId(null);
    setIsUploading(true);
    setPaymentMessage(null);

    try {
      const intent = await BillingService.createPaymentIntent({
        amount: Math.round(selectedService.price * 100),
        currency: 'usd',
        metadata: {
          serviceId: selectedService.id,
          email: formData.email,
        },
        setupForFutureUse: true, // Setup for future use when adding new method
      });

      if (!intent?.clientSecret) {
        setPaymentMessage('Unable to start payment. Please try again.');
        return;
      }

      setClientSecret(intent.clientSecret);
      setPaymentStep('pay');
    } catch (error) {
      console.error('Error creating payment intent:', error);
      setPaymentMessage('Error creating payment intent. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentWithSavedMethod = async () => {
    if (!selectedService || !user || !selectedPaymentMethodId) return;

    setIsUploading(true);
    setPaymentMessage(null);

    try {
      const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
      if (!selectedMethod) throw new Error('Selected payment method not found');

      const intent = await BillingService.createPaymentIntentWithPaymentMethod({
        amount: selectedService.price,
        currency: 'usd',
        paymentMethodId: selectedMethod.stripe_payment_method_id,
        metadata: {
          serviceId: selectedService.id,
          email: formData.email,
        },
      });

      if (!intent?.clientSecret) {
        setPaymentMessage('Unable to process payment. Please try again.');
        return;
      }

      setClientSecret(intent.clientSecret);
      setPaymentStep('pay');
    } catch (error) {
      console.error('Error processing payment:', error);
      setPaymentMessage('Error processing payment. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePaymentMethod = async (stripePaymentMethodId: string) => {
    if (!user) return;

    try {
      // Save to our database using the Supabase function
      const savedMethod = await BillingService.savePaymentMethod({
        user_id: user.id,
        stripe_payment_method_id: stripePaymentMethodId,
        type: 'card', // Default to card type
        last4: undefined, // Will be filled by the function
        brand: undefined, // Will be filled by the function
        expiry_month: undefined, // Will be filled by the function
        expiry_year: undefined, // Will be filled by the function
      });

      if (savedMethod) {
        // Reload payment methods to get the updated list
        await loadPaymentMethods();
      } else {
        throw new Error('Failed to save payment method');
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      throw error;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render content based on portal context
  const content = (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Progress Steps */}
      {currentStep > 1 && (
        <div className="mb-8">
          <ProgressSteps steps={steps} currentStep={currentStep} />
        </div>
      )}

      {/* Order Submitted Success */}
      {orderSubmitted && (
        <Card className="text-center py-12 mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Order Submitted Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your custom ad order has been received and is being processed. 
            You'll receive email notifications as your order progresses.
          </p>
          <div className="space-y-2 mb-6">
            <p className="text-sm text-gray-500">
              <strong>Order ID:</strong> {submittedOrderId}
            </p>
            <p className="text-sm text-gray-500">
              <strong>Service:</strong> {selectedService?.title}
            </p>
            <p className="text-sm text-gray-500">
              <strong>Total:</strong> ${selectedService?.price}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => window.location.href = isHostPortal ? '/host/custom-ads' : '/client/custom-ads'}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View My Orders
            </Button>
            <Button
              onClick={handleStartOver}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Another Order
            </Button>
          </div>
        </Card>
      )}

      {/* Service Description */}
      {!orderSubmitted && (
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Custom Ad Creation Services
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Choose from graphic design, photography, or videography services to create stunning vertical ads for our kiosk network.
          </p>
          
          {/* New Custom Ad Creation Feature */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-8 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4">
                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  New: Flexible Custom Ad Creation
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Upload any media files with any dimensions
                </p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Create custom ads with complete flexibility - upload images, videos, and documents of any size or format. 
              Perfect for complex projects that need custom dimensions or multiple media types.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="flex items-center">
                <Check className="w-4 h-4 mr-1 text-green-500" />
                Any dimensions supported
              </span>
              <span className="flex items-center">
                <Check className="w-4 h-4 mr-1 text-green-500" />
                Multiple file types
              </span>
              <span className="flex items-center">
                <Check className="w-4 h-4 mr-1 text-green-500" />
                Up to 20 files per project
              </span>
              <span className="flex items-center">
                <Check className="w-4 h-4 mr-1 text-green-500" />
                100MB per file
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Service Selection */}
      {!orderSubmitted && currentStep === 1 && (
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {services.map((service) => (
            <Card key={service.id} className="text-center hover:shadow-elevated transition-all duration-300 hover:scale-105">
              <div className="p-8">
                <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300 flex items-center justify-center mx-auto mb-6">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{service.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-center gap-2 text-lg font-semibold text-primary-600">
                    <DollarSign className="w-5 h-5" />
                    <span>${service.price}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{service.turnaround}</span>
                  </div>
                  {service.timeLimit && (
                    <div className="text-sm text-gray-500">
                      {service.timeLimit}
                    </div>
                  )}
                  {service.videoLength && (
                    <div className="text-sm text-gray-500">
                      {service.videoLength}
                    </div>
                  )}
                  {service.requiresLocation && (
                    <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
                      <MapPin className="w-4 h-4" />
                      <span>50-mile radius required</span>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={() => handleServiceSelect(service)}
                  className="w-full"
                  size="lg"
                >
                  Select Service
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

        {/* Disclaimer Modal */}
        {showDisclaimer && selectedService && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                  <h3 className="text-xl font-bold">Location Requirement</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {selectedService.title} requires a photography or videography session within 50 miles 
                  of available kiosk locations. Please confirm that you can meet this requirement.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleDisclaimerCancel}
                    variant="secondary"
                    className="flex-1"
                  >
                    Go Back
                  </Button>
                  <Button 
                    onClick={handleDisclaimerConfirm}
                    className="flex-1"
                  >
                    Confirm
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
                  
                  
                  {/* Address Autocomplete Suggestions */}
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                          onClick={() => selectAddressSuggestion(suggestion)}
                        >
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <span className="text-sm text-gray-900 dark:text-white truncate">
                              {suggestion}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Loading indicator for address autocomplete */}
                  {isLoadingAddress && (
                    <div className="absolute right-3 top-8">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {/* Date and Time Selection for Photography/Videography */}
                {(selectedService?.id === 'photography' || selectedService?.id === 'videography') && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.preferredDate}
                        onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]} // Only future dates
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.preferredDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      />
                      {formErrors.preferredDate && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.preferredDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Time (Optional)
                      </label>
                      <input
                        type="time"
                        value={formData.preferredTime}
                        onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.preferredTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      />
                      {formErrors.preferredTime && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.preferredTime}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className='dark:text-white'>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Details
                  </label>
                  <textarea
                    value={formData.details}
                    onChange={(e) => handleInputChange('details', e.target.value)}
                    className="input min-h-[120px] resize-none"
                    placeholder="Describe how you want your ad to look and any specific requirements..."
                    required
                  />
                  {formErrors.details && (
                    <p className="mt-1 text-xs text-danger-600">{formErrors.details}</p>
                  )}
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Media Assets (Max 20 files)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-rar-compressed,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      Any dimensions allowed • Images up to 100MB • Videos up to 5 minutes • Many common document types supported
                    </p>
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      variant="secondary"
                      className="mt-4"
                    >
                      Choose Files
                    </Button>
                  </div>

                  {/* File Validation Errors */}
                  {fileValidationErrors.length > 0 && (
                    <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                            File Validation Errors
                          </h3>
                          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                            <ul className="list-disc list-inside space-y-1">
                              {fileValidationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="mt-3">
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Please ensure your files meet all requirements: JPG/PNG images (10MB max), MP4 videos (500MB max), 9:16 aspect ratio, and 1080×1920 or 2160×3840 resolution.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File List */}
                  {formData.files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            {file.type.startsWith('video/') ? (
                              <FileVideo className="w-5 h-5 text-blue-500" />
                            ) : (
                              <FileImage className="w-5 h-5 text-green-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeFile(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


                {/* Virus Scan Notice */}
                {/* <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-blue-500" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      All uploaded files will be automatically scanned for viruses before processing.
                    </p>
                  </div>
                </div> */}

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Processing...' : `Pay Now - $${selectedService.price}`}
                  </Button>
                </div>
              </form>
              )}

              {paymentStep === 'method' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Choose Payment Method
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Select a saved payment method or add a new one
                    </p>
                  </div>

                  {isLoadingPaymentMethods ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600 dark:text-gray-400">Loading payment methods...</p>
                    </div>
                  ) : (
                    <PaymentMethodSelector
                      paymentMethods={paymentMethods}
                      selectedMethodId={selectedPaymentMethodId}
                      onMethodSelect={handlePaymentMethodSelect}
                      onAddNewMethod={handleAddNewMethod}
                      amount={selectedService.price}
                      onPayWithSavedMethod={handlePaymentWithSavedMethod}
                      isProcessing={isUploading}
                    />
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setPaymentStep('form')}
                    >
                      Back
                    </Button>
                    
                    {/* Primary action now moved into PaymentMethodSelector */}
                  </div>

                  {paymentMessage && (
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">
                      {paymentMessage}
                    </p>
                  )}
                </div>
              )}

              {paymentStep === 'pay' && clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripePaySection
                    amount={selectedService.price}
                    email={formData.email}
                    onBack={() => setPaymentStep('method')}
                    message={paymentMessage}
                    setMessage={setPaymentMessage}
                    onSavePaymentMethod={selectedPaymentMethodId === null ? handleSavePaymentMethod : undefined}
                    onSuccess={async () => {
                      try {
                        if (!user) return;
                        
                        // Save the order
                        const orderId = await CustomAdsService.createOrder({
                          userId: user.id,
                          serviceKey: selectedService.id,
                          firstName: formData.firstName,
                          lastName: formData.lastName,
                          email: formData.email,
                          phone: formData.phone,
                          address: formData.address,
                          details: formData.details,
                          files: formData.files,
                          totalAmount: selectedService.price,
                        });
                        
                        setSubmittedOrderId(orderId);
                        setPaymentStep('success');
                        setPaymentMessage('Payment succeeded and your order has been saved.');
                      } catch (e) {
                        console.error('Error saving order after payment:', e);
                        setPaymentMessage('Payment succeeded, but saving your order failed. Please contact support.');
                      }
                    }}
                  />
                </Elements>
              )}

              {paymentStep === 'success' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Payment Successful!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Your custom ad order has been submitted and payment has been processed.
                    </p>
                    {paymentMessage && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        {paymentMessage}
                      </p>
                    )}
                  </div>

          {/* Proof Preview & Approve/Reject - shows when designer uploads proofs */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3">Design Proof</h4>
            {isLoadingProofs ? (
              <div className="text-sm text-gray-600">Checking for proofs…</div>
            ) : submittedOrderProofs.length === 0 ? (
              <div className="text-sm text-gray-600">No proofs yet. You will be notified once the designer submits a proof.</div>
            ) : (
              <div className="space-y-4">
                {submittedOrderProofs.map((proof) => (
                  <div key={proof.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{proof.title || 'Proof'} • V{proof.version_number || '?'}</div>
                        <div className="text-xs text-gray-600">Status: {proof.status.replace('_',' ')} • {new Date(proof.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {proof.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{proof.description}</p>
                    )}
                    
                    {/* Show existing feedback/comments */}
                    {proof.client_feedback && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Your Previous Feedback:</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{proof.client_feedback}</p>
                      </div>
                    )}
                    
                    {proof.designer_notes && (
                      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Designer Notes:</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{proof.designer_notes}</p>
                      </div>
                    )}
                    {/* files array when using custom_ad_proofs; fallback to single file fields if present */}
                    {Array.isArray(proof.files) && proof.files.length > 0 ? (
                      <div className="grid gap-3">
                        {proof.files.map((file: any, idx: number) => (
                          <div key={idx}>
                            {file.type?.startsWith('image/') ? (
                              <img src={file.url} alt={file.name} className="max-h-[420px] rounded mx-auto" />
                            ) : file.type?.startsWith('video/') ? (
                              <video src={file.url} controls className="max-h-[420px] rounded mx-auto" />
                            ) : (
                              <a href={file.url} className="text-blue-600 underline text-sm">View file</a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">No previewable files attached.</div>
                    )}

                    {(proof.status === 'submitted' || proof.status === 'revision_requested') && (
                      <div className="flex gap-3 pt-4">
                        <Button 
                          onClick={() => openCommentsModal(proof, 'approve')} 
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={() => openCommentsModal(proof, 'reject')}
                        >
                          Request Edits
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">i</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                          What's Next?
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Our team will review your order and create your custom ad. Once approved, you can use it to create a campaign.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPaymentStep('form');
                        setCurrentStep(1);
                        setFormData({
                          firstName: '',
                          lastName: '',
                          email: '',
                          phone: '',
                          address: '',
                          details: '',
                          files: []
                        });
                        setFormErrors({});
                        setFileValidationErrors([]);
                        setPaymentMessage(null);
                        setSubmittedOrderId(null);
                      }}
                      className="flex-1"
                    >
                      Create Another Ad
                    </Button>
                    <Button
                      onClick={() => navigate('/client/manage-custom-ads')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Manage Custom Ad
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Comments Modal */}
        {showCommentsModal && selectedProofForComments && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">
                    {selectedProofForComments.action === 'approve' ? 'Approve Proof' : 'Request Edits'}
                  </h3>
                  <Button
                    onClick={() => setShowCommentsModal(false)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {selectedProofForComments.action === 'approve' 
                      ? 'Comments (Optional)' 
                      : 'Feedback for Designer *'}
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={
                      selectedProofForComments.action === 'approve'
                        ? 'Add any comments about the approved proof...'
                        : 'Please provide specific feedback about what needs to be changed...'
                    }
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowCommentsModal(false)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitComments}
                    className={`flex-1 ${
                      selectedProofForComments.action === 'approve'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {selectedProofForComments.action === 'approve' ? 'Approve' : 'Request Edits'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
  );

  // Return content wrapped in appropriate layout based on portal context
  if (isHostPortal) {
    // For host portal, return content without DashboardLayout since HostLayout handles the layout
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Custom Ads & Creation</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Professional ad creation services tailored to your needs</p>
        </div>
        {content}
      </div>
    );
  } else if (isClientPortal) {
    // For client portal, use DashboardLayout
    return (
      <DashboardLayout
        title="Custom Ads & Creation"
        subtitle="Professional ad creation services tailored to your needs"
      >
        {content}
      </DashboardLayout>
    );
  } else {
    // For public access, use DashboardLayout
    return (
      <DashboardLayout
        title="Custom Ads & Creation"
        subtitle="Professional ad creation services tailored to your needs"
      >
        {content}
      </DashboardLayout>
    );
  }
}

function StripePaySection(props: {
  amount: number;
  email: string;
  onBack: () => void;
  message: string | null;
  setMessage: (m: string | null) => void;
  onSuccess?: () => void | Promise<void>;
  onSavePaymentMethod?: (paymentMethodId: string) => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    props.setMessage(null);
    
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/client',
        receipt_email: props.email,
      },
      redirect: 'if_required',
    });
    
    if (error) {
      props.setMessage(error.message || 'Payment failed.');
      setIsProcessing(false);
      return;
    }
    
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      props.setMessage('Payment succeeded!');
      
      // Save the payment method if the callback is provided
      if (props.onSavePaymentMethod && paymentIntent.payment_method) {
        try {
          await props.onSavePaymentMethod(paymentIntent.payment_method as string);
        } catch (saveError) {
          console.error('Error saving payment method:', saveError);
          // Don't fail the payment if saving the method fails
        }
      }
      
      if (props.onSuccess) {
        await Promise.resolve(props.onSuccess());
      }
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleConfirm} className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Payment</h3>
          <span className="text-lg font-semibold">${props.amount}</span>
        </div>
      </div>

      <PaymentElement />

      {props.message && (
        <p className="text-sm text-red-600">{props.message}</p>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={props.onBack}>
          Back
        </Button>
        <Button type="submit" disabled={!stripe || !elements || isProcessing}>
          {isProcessing ? 'Processing...' : 'Confirm and Pay'}
        </Button>
      </div>
    </form>
  );
}

