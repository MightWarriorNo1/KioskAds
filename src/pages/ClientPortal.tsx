import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardHome from './DashboardHome';
import CampaignsPage from './CampaignsPage';
import NewCampaignPage from './NewCampaignPage';
import KioskSelectionPage from './KioskSelectionPage';
import SelectWeeksPage from './SelectWeeksPage';
import AddMediaDurationPage from './AddMediaDurationPage';
import ReviewSubmitPage from './ReviewSubmitPage';
import AnalyticsPage from './AnalyticsPage';
import BillingPage from './BillingPage';
import ProfilePage from './ProfilePage';
import HelpCenterPage from './HelpCenterPage';
import ContactPage from './ContactPage';
import KiosksPage from './KiosksPage';
import CampaignDetailsPage from './CampaignDetailsPage';
import ProofOfPlayPage from './ProofOfPlayPage';
import SingleProofOfPlayPage from './SingleProofOfPlayPage';
import CustomAdsPage from './CustomAdsPage';
import CustomAdCreationPage from './CustomAdCreationPage';
import CustomAdManagementPage from './CustomAdManagementPage';
import CustomAdDetailsPage from './CustomAdDetailsPage';
import ManageMyCustomAdPage from './ManageMyCustomAdPage';

export default function ClientPortal() {
  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />
      <Route path="/new-campaign" element={<NewCampaignPage />} />
      <Route path="/kiosk-selection" element={<KioskSelectionPage />} />
      <Route path="/select-weeks" element={<SelectWeeksPage />} />
      <Route path="/add-media-duration" element={<AddMediaDurationPage />} />
      <Route path="/review-submit" element={<ReviewSubmitPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/proof-of-play" element={<ProofOfPlayPage />} />
      <Route path="/campaigns/:campaignId/assets/:assetId/proof-of-play" element={<SingleProofOfPlayPage />} />
      <Route path="/billing" element={<BillingPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/kiosks" element={<KiosksPage />} />
      <Route path="/custom-ads" element={<CustomAdsPage />} />
      <Route path="/custom-ads/create" element={<CustomAdCreationPage />} />
      <Route path="/custom-ads/manage" element={<CustomAdManagementPage />} />
      <Route path="/custom-ads/:id" element={<CustomAdDetailsPage />} />
      <Route path="/manage-custom-ads" element={<ManageMyCustomAdPage />} />
    </Routes>
  );
}