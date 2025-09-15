import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HostLayout from '../components/layouts/HostLayout';
import HostDashboard from '../components/host/HostDashboard';
import KioskManager from '../components/host/KioskManager';
import AdAssignment from '../components/host/AdAssignment';
import AdUpload from '../components/host/AdUpload';
import RevenueTracker from '../components/host/RevenueTracker';
import PayoutHistory from '../components/host/PayoutHistory';
import HostProofOfPlay from '../components/host/ProofOfPlay';
import CreateCampaign from '../components/host/CreateCampaign';
import CustomAdsPage from './CustomAdsPage';

export default function HostPortal() {
  return (
    <HostLayout>
      <Routes>
        <Route path="/" element={<HostDashboard />} />
        <Route path="/kiosks" element={<KioskManager />} />
        <Route path="/ads" element={<AdAssignment />} />
        <Route path="/ads/upload" element={<AdUpload />} />
        <Route path="/campaigns/new" element={<CreateCampaign />} />
        <Route path="/revenue" element={<RevenueTracker />} />
        <Route path="/payouts" element={<PayoutHistory />} />
        <Route path="/proof-of-play" element={<HostProofOfPlay />} />
        <Route path="/custom-ads" element={<CustomAdsPage />} />
      </Routes>
    </HostLayout>
  );
}