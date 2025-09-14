import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, BarChart3, MapPin } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { CampaignService, Campaign } from '../services/campaignService';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const campaigns = await CampaignService.getUserCampaigns(user.id);
        // Get only the 2 most recent campaigns
        setRecentCampaigns(campaigns.slice(0, 2));
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600';
      case 'pending':
        return 'bg-yellow-600';
      case 'completed':
        return 'bg-blue-600';
      case 'cancelled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };
  
  return (
    <DashboardLayout
      title="Welcome back!"
      subtitle="Manage your ad campaigns and track performance across our network of digital kiosks"
    >
      {/* Recent Campaigns Section */}
      <div className="mb-12 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recent Campaigns</h2>
          <Link to="/client/campaigns" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white flex items-center gap-2">
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {loading ? (
            // Loading state
            <>
              <Card>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded mt-4"></div>
                </div>
              </Card>
              <Card>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded mt-4"></div>
                </div>
              </Card>
            </>
          ) : recentCampaigns.length > 0 ? (
            // Real campaign data
            recentCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold mb-1">{campaign.name}</h3>
                    <p className="text-sm">{campaign.kiosk_count} kiosk{campaign.kiosk_count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={`${getStatusColor(campaign.status)} text-white text-xs px-2 py-1 rounded capitalize`}>
                    {campaign.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Price:</span>
                    <span>{formatCurrency(campaign.total_cost)}</span>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  className="w-full mt-4" 
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate(`/client/campaigns/${campaign.id}`)}
                >
                  View Details
                </Button>
              </Card>
            ))
          ) : (
            // No campaigns state
            <div className="md:col-span-2">
              <Card>
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-600 mb-4">Get started by creating your first advertising campaign</p>
                  <Link to="/client/new-campaign">
                    <Button leftIcon={<Plus className="h-4 w-4" />}>Create Campaign</Button>
                  </Link>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Need Help Section */}
      <Card className="mb-12 animate-fade-in-up">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-3">Need Help Setting Up Your Campaign?</h3>
            <p className="mb-6">
              Let our experts handle everything for you. From strategy to execution, we'll create and manage your advertising campaign so you can focus on your business.
            </p>
            <Button 
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/client/contact')}
            >
              Contact Us for Full Service
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Actions Section */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create New Campaign */}
          <Card>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Create New Campaign</h3>
            <p className="mb-6">Set up a new advertising campaign on our kiosks</p>
            <Link to="/client/new-campaign" className="inline-flex">
              <Button leftIcon={<Plus className="h-4 w-4" />}>New Campaign</Button>
            </Link>
          </Card>

          {/* Browse Kiosk Locations */}
          <Card>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Browse Kiosk Locations</h3>
            <p className="mb-6">View all available kiosk locations for advertising</p>
            <Link to="/client/kiosks" className="inline-flex">
              <Button leftIcon={<MapPin className="h-4 w-4" />}>View Kiosks</Button>
            </Link>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
