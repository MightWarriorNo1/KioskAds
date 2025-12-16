import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import HostLanding from './pages/HostLanding';
import KiosksPage from './pages/KiosksPage';
import CustomAdsPage from './pages/CustomAdsPage';
import PartnersPage from './pages/PartnersPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ContactPage from './pages/ContactPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import FAQsPage from './pages/FAQsPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AuthCallback from './pages/AuthCallback';
import ResetPassword from './pages/ResetPassword';
import ClientPortal from './pages/ClientPortal';
import HostPortal from './pages/HostPortal';
import AdminPortal from './pages/AdminPortal';
import DesignerPortal from './pages/DesignerPortal';
import DebugAssignmentPage from './pages/DebugAssignmentPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AnnouncementBar from './components/shared/AnnouncementBar';
import LanderRedirect from './components/LanderRedirect';

// Component to conditionally render AnnouncementBar
function ConditionalAnnouncementBar() {
  const location = useLocation();
  
  // Don't show banner on admin, host, client, or designer portals
  const isPortalRoute = location.pathname.startsWith('/admin') || 
                       location.pathname.startsWith('/host') || 
                       location.pathname.startsWith('/client') || 
                       location.pathname.startsWith('/designer');
  
  if (isPortalRoute) {
    return null;
  }
  
  return <AnnouncementBar />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ConfirmationProvider>
            <Router>
            <ErrorBoundary>
              <div className="min-h-screen bg-[rgb(var(--surface))] dark:bg-gray-900">
                <ConditionalAnnouncementBar />
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/faqs" element={<FAQsPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="/custom-ads" element={<CustomAdsPage />} />
                  <Route path="/partners" element={<PartnersPage />} />
                  <Route path="/hosting" element={<HostLanding />} />
                  <Route path="/kiosks" element={<KiosksPage />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/confirm-email" element={<AuthCallback />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/lander" element={<LanderRedirect />} />
                  <Route 
                    path="/client/*" 
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <ClientPortal />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/host/*" 
                    element={
                      <ProtectedRoute allowedRoles={['host']}>
                        <HostPortal />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/debug-assignments" 
                    element={
                      <ProtectedRoute allowedRoles={['host', 'admin']}>
                        <DebugAssignmentPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/designer/*" 
                    element={
                      <ProtectedRoute allowedRoles={['designer']}>
                        <DesignerPortal />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/*" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminPortal />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </ErrorBoundary>
            </Router>
          </ConfirmationProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;