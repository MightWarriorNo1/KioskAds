import React, { useState } from 'react';
import { X, CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { BillingService } from '../../services/billingService';

interface CreativePackage {
  id: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  reviews: number;
  thumbnail: string;
  category: 'image' | 'video' | 'bundle';
  tags: string[];
  deliveryTime: string;
}

interface CampaignPaymentDetails {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  kiosks: { id: string; name: string }[] | string[];
  totalSlots: number;
  totalCost: number;
  assetUrl?: string;
  assetType?: 'image' | 'video';
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  package: CreativePackage | null;
  onPurchase: (packageId: string, paymentData: PaymentData) => void;
  campaignDetails?: CampaignPaymentDetails;
}

interface PaymentData {}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

export default function PurchaseModal({ isOpen, onClose, package: pkg, onPurchase, campaignDetails }: PurchaseModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const initializePayment = async () => {
    if (!pkg) return;
    setIsProcessing(true);
    setMessage(null);
    const intent = await BillingService.createPaymentIntent({ amount: Math.round(pkg.price * 100), currency: 'usd', metadata: { packageId: pkg.id } });
    if (intent?.clientSecret) {
      setClientSecret(intent.clientSecret);
      setStep('payment');
    } else {
      setMessage('Unable to start payment. Please try again.');
    }
    setIsProcessing(false);
  };

  const handleSuccess = () => {
    setStep('success');
    if (pkg) {
      onPurchase(pkg.id, {});
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onClose();
      setStep('details');
    } else {
      onClose();
    }
  };

  if (!isOpen || !pkg) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'details' && 'Purchase Package'}
            {step === 'payment' && 'Payment Details'}
            {step === 'success' && 'Purchase Successful'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'details' && (
            <div className="space-y-6">
              {/* Header Details */}
              <div className="flex space-x-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={campaignDetails?.assetUrl || pkg.thumbnail} 
                    alt={campaignDetails ? campaignDetails.name : pkg.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{campaignDetails ? campaignDetails.name : pkg.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{campaignDetails?.description || pkg.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-2xl font-bold text-gray-900">${pkg.price}</span>
                    {!campaignDetails && (
                      <span className="text-sm text-gray-500">{pkg.deliveryTime}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Campaign Details */}
              {campaignDetails ? (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Dates: </span>
                      <span>{new Date(campaignDetails.startDate).toLocaleDateString()} - {new Date(campaignDetails.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Total slots: </span>
                      <span>{campaignDetails.totalSlots}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Kiosks: </span>
                      <span>
                        {Array.isArray(campaignDetails.kiosks)
                          ? (typeof campaignDetails.kiosks[0] === 'string'
                              ? (campaignDetails.kiosks as string[]).join(', ')
                              : (campaignDetails.kiosks as { id: string; name: string }[]).map(k => k.name).join(', '))
                          : ''}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Total cost: </span>
                      <span>${campaignDetails.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Package Includes:</h4>
                  <ul className="space-y-1">
                    {pkg.tags.map((tag, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={initializePayment}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>{isProcessing ? 'Please wait...' : 'Proceed to Payment'}</span>
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripePaymentForm 
                title={pkg.title}
                price={pkg.price}
                message={message}
                setMessage={setMessage}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                onBack={() => setStep('details')}
                onSuccess={handleSuccess}
              />
            </Elements>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Purchase Successful!</h3>
                <p className="text-gray-600">
                  Your purchase of "{pkg.title}" has been completed successfully.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">What's Next?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• You'll receive a confirmation email shortly</li>
                  <li>• Your creative package will be delivered within {pkg.deliveryTime}</li>
                  <li>• You can track your order in your dashboard</li>
                </ul>
              </div>

              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StripePaymentForm(props: {
  title: string;
  price: number;
  message: string | null;
  setMessage: (m: string | null) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    props.setIsProcessing(true);
    props.setMessage(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/client',
      },
      redirect: 'if_required',
    });
    if (error) {
      props.setMessage(error.message || 'Payment failed.');
      props.setIsProcessing(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      props.onSuccess();
    }
    props.setIsProcessing(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{props.title}</span>
          <span className="text-lg font-semibold text-gray-900">${props.price}</span>
        </div>
      </div>

      <PaymentElement />

      {props.message && (
        <p className="text-red-600 text-sm">{props.message}</p>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">Secure Payment</p>
            <p className="text-sm text-blue-700 mt-1">
              Your payment information is encrypted and secure. We use industry-standard SSL encryption.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={props.onBack}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={props.isProcessing || !stripe || !elements}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {props.isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              <span>Pay ${props.price}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
