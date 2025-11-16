import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

/**
 * Component to handle password recovery redirects from Supabase
 * This catches redirects that might go to root or other paths
 */
export default function PasswordRecoveryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkForRecoveryToken = async () => {
      // Check URL hash for recovery token
      const hash = window.location.hash;
      const hasRecoveryToken = hash.includes('type=recovery') || 
                               (hash.includes('access_token') && hash.includes('type=recovery'));
      
      if (hasRecoveryToken) {
        // Redirect to reset-password page with the hash fragment
        const hashPart = hash.startsWith('#') ? hash : `#${hash}`;
        navigate(`/reset-password${hashPart}`, { replace: true });
        return;
      }

      // Also check if there's already a session with recovery context
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if this session was created from a recovery token
        // by checking the URL or session metadata
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('type') === 'recovery' || hash.includes('type=recovery')) {
          navigate('/reset-password', { replace: true });
          return;
        }
      }

      // If no recovery token found, redirect to home
      navigate('/', { replace: true });
    };

    checkForRecoveryToken();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Redirecting...</div>
    </div>
  );
}

