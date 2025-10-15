import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Video, 
  Palette, 
  Upload, 
  X, 
  AlertCircle,
  MapPin,
  FileImage,
  FileVideo,
  Trash2,
  CheckCircle,
  ArrowRight,
  Camera
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
  preferredDate?: string;
  preferredTime?: string;
  includeCustomVideo?: boolean;
}

const services: ServiceTile[] = [
  {
    id: 'graphic-design',
    title: 'Vertical Ad with User Uploaded Files',
    description: 'Custom graphic design using your provided assets',
    price: 125,
    turnaround: '5-day turnaround',
    icon: <Palette className="h-8 w-8" />,
    requiresLocation: false
  },
  {
    id: 'photography',
    title: 'Vertical Ad with Custom Photography',
    description: 'Professional photography session for your ad',
    price: 199,
    turnaround: '5-day turnaround',
    icon: <Camera className="h-8 w-8" />,
    requiresLocation: true,
    timeLimit: '2hr time limit'
  },
  {
    id: 'videography',
    title: 'Vertical Ad with Custom Video',
    description: 'Professional video production for your ad',
    price: 399,
    turnaround: '7-day turnaround',
    icon: <Video className="h-8 w-8" />,
    requiresLocation: true,
    timeLimit: '3hr time limit',
    videoLength: '15 sec - 30 sec video'
  }
];

export default function HostCustomAdsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceTile | null>(null);
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
    preferredTime: '',
    includeCustomVideo: false
  });
  const [formErrors, setFormErrors] = useState<Partial<OrderFormData>>({});
  const [fileValidationErrors, setFileValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'form' | 'pay' | 'method' | 'success'>('form');
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const navigate=useNavigate();

  const loadPaymentMethods = useCallback(async () => {
    if (!user?.id) return;
    
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
    }
  }, [user?.id]);

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

  // Load payment methods when user reaches payment step
  useEffect(() => {
    if (currentStep === 3 && user?.id) {
      loadPaymentMethods();
      setPaymentStep('method');
    }
  }, [currentStep, user?.id, loadPaymentMethods]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

  const steps = [
    { number: 1, name: 'Select Service', current: currentStep === 1, completed: currentStep > 1 },
    { number: 2, name: 'File Upload', current: currentStep === 2, completed: currentStep > 2 },
    { number: 3, name: 'Payment', current: currentStep === 3, completed: currentStep > 3 },
    { number: 4, name: 'Review', current: currentStep === 4, completed: currentStep > 4 },
  ];


  const handleInputChange = (field: keyof OrderFormData, value: string | File[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
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
      
      // Move to step 3 (Payment)
      setCurrentStep(3);
      
      // Upload files if any (but keep original File objects for createOrder)
      const uploadedFiles: unknown[] = [];
      for (const file of formData.files) {
        const uploadedFile = await CustomAdsService.uploadFiles(user.id, [file]);
        uploadedFiles.push(...uploadedFile);
      }

      // Don't overwrite formData.files - keep the original File objects
      // The uploadedFiles are just for reference, createOrder needs the original Files

      // Load payment methods and show payment method selection
      await loadPaymentMethods();
      setPaymentStep('method');
    } catch {
      alert('Error submitting order. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentMethodSelect = (methodId: string | null) => {
    setSelectedPaymentMethodId(methodId);
  };

  const handleAddNewMethod = async () => {
    if (!selectedService || !user || isUploading) return;
    
    setSelectedPaymentMethodId(null);
    setIsUploading(true);

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
        alert('Unable to start payment. Please try again.');
        return;
      }

      setClientSecret(intent.clientSecret);
      setPaymentStep('pay');
    } catch (error) {
      console.error('Error creating payment intent:', error);
      alert('Error creating payment intent. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentWithSavedMethod = async () => {
    if (!selectedService || !user || !selectedPaymentMethodId || isUploading) return;

    setIsUploading(true);
    setPaymentMessage(null);

    try {
      const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
      if (!selectedMethod) throw new Error('Selected payment method not found');

      // Process payment directly with saved payment method
      const result = await BillingService.processPaymentWithSavedMethod({
        amount: selectedService.price,
        currency: 'usd',
        paymentMethodId: selectedMethod.stripe_payment_method_id,
        userId: user.id,
        metadata: {
          serviceId: selectedService.id,
          email: formData.email,
        },
      });

      if (!result.success) {
        setPaymentMessage(result.error || 'Payment failed. Please try again.');
        return;
      }

      // Payment successful, create the order and move to success step
      const order = await CustomAdsService.createOrder({
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
      
      setSubmittedOrderId(order);
      setOrderSubmitted(true);
      setCurrentStep(4); // Move to step 4 (Review)
      setPaymentStep('success');
      setPaymentMessage('Payment succeeded and your order has been saved.');
      setShowOrderForm(false); // Hide payment window
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
        // Reload payment methods to show the newly saved one
        await loadPaymentMethods();
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      // Don't fail the payment if saving the method fails
    }
  };

  const handlePaymentSuccess = async () => {
    if (!selectedService || !user) return;
    
    try {
      setIsUploading(true);
      
      // Create the order
      const order = await CustomAdsService.createOrder({
        userId: user.id,
        serviceKey: selectedService.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        details: formData.details,
        files: formData.files, // Pass the actual File objects
        totalAmount: selectedService.price
      });

      setSubmittedOrderId(order);
      setOrderSubmitted(true);
      setCurrentStep(4); // Move to step 4 (Review)
      setShowOrderForm(false); // Hide payment window
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
                className={`p-8 transition-all duration-200 hover:shadow-lg ${
                  selectedService?.id === service.id
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:shadow-md'
                }`}
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
                  <div className="space-y-2 mb-6">
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
                  <Button
                    onClick={() => {
                      setSelectedService(service);
                      setCurrentStep(2);
                    }}
                    className="w-full px-6 py-3"
                    variant={selectedService?.id === service.id ? 'primary' : 'secondary'}
                  >
                    Continue
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Step */}
      {currentStep === 2 && selectedService && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              File Upload & Project Details
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Upload your media assets and provide project details
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

              <div className="space-y-8">
                {/* Contact Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Contact Information
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        disabled
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500 dark:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        disabled
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500 dark:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500 dark:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-800"
                        placeholder="Enter your phone number"
                        required
                      />
                      {formErrors.phone && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {formErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-800"
                      placeholder="Enter your address"
                    />
                  </div>

                  {/* Custom Video Inclusion Checkbox for Photography Service */}
                  {selectedService?.id === 'photography' && (
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="includeCustomVideo"
                        checked={formData.includeCustomVideo}
                        onChange={(e) => handleInputChange('includeCustomVideo', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includeCustomVideo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Include custom video on host side
                      </label>
                    </div>
                  )}

                  {/* Date and Time Selection for Photography with Custom Video or Videography */}
                  {((selectedService?.id === 'photography' && formData.includeCustomVideo) || selectedService?.id === 'videography') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Preferred Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={formData.preferredDate}
                          onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-800"
                        />
                        {formErrors.preferredDate && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {formErrors.preferredDate}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Preferred Time (Optional)
                        </label>
                        <input
                          type="time"
                          value={formData.preferredTime}
                          onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-800"
                        />
                        {formErrors.preferredTime && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {formErrors.preferredTime}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Project Details */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                      <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Project Requirements
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Project Details *
                    </label>
                    <div className="relative">
                      <textarea
                        value={formData.details}
                        onChange={(e) => handleInputChange('details', e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-800 resize-none"
                        placeholder="Describe your vision for the ad. Include details about colors, style, messaging, target audience, and any specific requirements..."
                        required
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                        {formData.details.length}/500
                      </div>
                    </div>
                    {formErrors.details && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {formErrors.details}
                      </p>
                    )}
                  </div>
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
                    onChange={handleFileUpload}
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
                    onClick={() => setCurrentStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    className="px-8 py-3"
                  >
                    Continue to Payment
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Payment Step */}
      {currentStep === 3 && selectedService && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Payment
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Complete your payment to submit your custom ad order
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
                {/* Payment Method Selection */}
                {paymentStep === 'method' && (
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Select Payment Method
                    </h3>
                    <PaymentMethodSelector
                      paymentMethods={paymentMethods}
                      selectedMethodId={selectedPaymentMethodId}
                      onMethodSelect={handlePaymentMethodSelect}
                      onAddNewMethod={handleAddNewMethod}
                      onPayWithSavedMethod={handlePaymentWithSavedMethod}
                      amount={selectedService.price}
                      isProcessing={isUploading}
                    />
                    
                    {paymentMessage && (
                      <p className="text-sm text-red-600 dark:text-red-400 text-center mt-4">
                        {paymentMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Processing */}
                {paymentStep === 'pay' && clientSecret && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complete Payment</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Amount: ${selectedService.price}
                      </p>
                      <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <PaymentForm onSuccess={handlePaymentSuccess} isProcessing={isUploading} onSavePaymentMethod={handleSavePaymentMethod} />
                      </Elements>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (paymentStep === 'pay') {
                        setPaymentStep('method');
                        setClientSecret(null);
                      } else {
                        setCurrentStep(2);
                      }
                    }}
                  >
                    Back
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

              {/* <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep(3)}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setShowOrderForm(true);
                    setCurrentStep(3);
                    loadPaymentMethods();
                    setPaymentStep('method');
                  }}
                  className="px-8 py-3"
                >
                  Proceed to Payment
                </Button>
              </div> */}
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
                    preferredTime: '',
                    includeCustomVideo: false
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

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Media Assets (Max 20 files)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 lg:p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-rar-compressed,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm lg:text-base">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs lg:text-sm text-gray-500">
                      Any dimensions allowed • Images up to 100MB • Videos up to 5 minutes • Many common document types supported
                    </p>
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      variant="secondary"
                      className="mt-4 w-full sm:w-auto"
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
                  onMethodSelect={handlePaymentMethodSelect}
                  onAddNewMethod={handleAddNewMethod}
                  onPayWithSavedMethod={handlePaymentWithSavedMethod}
                  amount={selectedService.price}
                  isProcessing={isUploading}
                />
                
                {paymentMessage && (
                  <p className="text-sm text-red-600 dark:text-red-400 text-center mt-4">
                    {paymentMessage}
                  </p>
                )}
                
                <div className="flex justify-end space-x-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCurrentStep(2);
                      setPaymentStep('form');
                    }}
                  >
                    Back
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
                    <PaymentForm onSuccess={handlePaymentSuccess} isProcessing={isUploading} onSavePaymentMethod={handleSavePaymentMethod} />
                  </Elements>
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
                    setCurrentStep(1);
                    // Reset form data
                    setFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      address: '',
                      details: '',
                      files: [],
                      preferredDate: '',
                      preferredTime: '',
                      includeCustomVideo: false
                    });
                    setFormErrors({});
                    setFileValidationErrors([]);
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
function PaymentForm({ onSuccess, isProcessing: externalProcessing, onSavePaymentMethod }: { onSuccess: () => void; isProcessing?: boolean; onSavePaymentMethod?: (paymentMethodId: string) => Promise<void> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use external processing state if provided, otherwise use internal state
  const processing = externalProcessing !== undefined ? externalProcessing : isProcessing;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/host/custom-ads',
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment failed:', error);
        alert(`Payment failed: ${error.message || 'Please try again.'}`);
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Save the payment method if the callback is provided
        if (onSavePaymentMethod && paymentIntent.payment_method) {
          try {
            await onSavePaymentMethod(paymentIntent.payment_method as string);
          } catch (saveError) {
            console.error('Error saving payment method:', saveError);
            // Don't fail the payment if saving the method fails
          }
        }
        
        // Don't set isProcessing to false here - let onSuccess handle it
        onSuccess();
      } else {
        console.log('Payment status:', paymentIntent?.status);
        alert('Payment was not successful. Please try again.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      alert('An error occurred during payment processing. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}
