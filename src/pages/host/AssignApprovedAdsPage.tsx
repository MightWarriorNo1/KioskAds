import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import ApprovedAdsAssignment from '../../components/host/ApprovedAdsAssignment';

export default function AssignApprovedAdsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="secondary"
          onClick={() => navigate('/host/ads')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ads
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Assign Approved Ads
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Assign your approved ads to kiosks immediately or schedule them for the future
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900 dark:text-green-100">
              Your ads are approved and ready to assign!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              You can assign them to your kiosks immediately or schedule them for specific dates. 
              Quick assign will run your ad for 30 days starting today.
            </p>
          </div>
        </div>
      </div>

      {/* Approved Ads Assignment Component */}
      <ApprovedAdsAssignment />
    </div>
  );
}
