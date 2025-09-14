import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../components/layouts/AdminLayout';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdReviewQueue from '../components/admin/AdReviewQueue';
import UserManagement from '../components/admin/UserManagement';
import KioskManagement from '../components/admin/KioskManagement';
import CouponManager from '../components/admin/CouponManager';
import SystemSettings from '../components/admin/SystemSettings';
import CreativeOrdersManagement from '../components/admin/CreativeOrdersManagement';
import MarketingTools from '../components/admin/MarketingTools';
import IntegrationManagement from '../components/admin/IntegrationManagement';
import AssetLifecycleManagement from '../components/admin/AssetLifecycleManagement';
import KioskGDriveFolderManager from '../components/admin/KioskGDriveFolderManager';
import RevenueAnalytics from '../components/admin/RevenueAnalytics';

export default function AdminPortal() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/review" element={<AdReviewQueue />} />
        <Route path="/creative-orders" element={<CreativeOrdersManagement />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/kiosks" element={<KioskManagement />} />
        <Route path="/coupons" element={<CouponManager />} />
        <Route path="/marketing" element={<MarketingTools />} />
        <Route path="/integrations" element={<IntegrationManagement />} />
        <Route path="/assets" element={<AssetLifecycleManagement />} />
        <Route path="/kiosk-folders" element={<KioskGDriveFolderManager />} />
        <Route path="/revenue" element={<RevenueAnalytics />} />
        <Route path="/settings" element={<SystemSettings />} />
      </Routes>
    </AdminLayout>
  );
}