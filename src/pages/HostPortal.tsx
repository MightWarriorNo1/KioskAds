import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HostLayout from '../components/layouts/HostLayout';
import HostDashboard from '../components/host/HostDashboard';
import KioskManager from '../components/host/KioskManager';
import AdAssignment from '../components/host/AdAssignment';
import AdUpload from '../components/host/AdUpload';
import RevenueTracker from '../components/host/RevenueTracker';
import PayoutHistory from '../components/host/PayoutHistory';
import HostAnalytics from '../components/host/HostAnalytics';
import { Navigate } from 'react-router-dom';
import HostNewCampaignPage from './host/NewCampaignPage';
import HostKioskSelectionPage from './host/KioskSelectionPage';
import HostSelectWeeksPage from './host/SelectWeeksPage';
import HostAddMediaDurationPage from './host/AddMediaDurationPage';
import HostReviewSubmitPage from './host/ReviewSubmitPage';
import CustomAdsPage from './CustomAdsPage';

export default function HostPortal() {
  return (
    <HostLayout>
      <Routes>
        <Route path="/" element={<HostDashboard />} />
        <Route path="/kiosks" element={<KioskManager />} />
        <Route path="/ads" element={<AdAssignment />} />
        <Route path="/ads/upload" element={<AdUpload />} />
        <Route path="/campaigns/new" element={<Navigate to="/host/new-campaign" replace />} />
        <Route path="/new-campaign" element={<HostNewCampaignPage />} />
        <Route path="/kiosk-selection" element={<HostKioskSelectionPage />} />
        <Route path="/select-weeks" element={<HostSelectWeeksPage />} />
        <Route path="/add-media-duration" element={<HostAddMediaDurationPage />} />
        <Route path="/review-submit" element={<HostReviewSubmitPage />} />
        <Route path="/revenue" element={<RevenueTracker />} />
        <Route path="/payouts" element={<PayoutHistory />} />
        <Route path="/analytics" element={<HostAnalytics />} />
        <Route path="/custom-ads" element={<CustomAdsPage />} />
      </Routes>
    </HostLayout>
  );
}