import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function LanderRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get invitation parameters from URL
    const invitation = searchParams.get('invitation');
    const email = searchParams.get('email');
    const role = searchParams.get('role');

    // Build the signup URL with invitation parameters
    const signupUrl = new URL('/signup', window.location.origin);
    
    if (invitation) {
      signupUrl.searchParams.set('invitation', invitation);
    }
    if (email) {
      signupUrl.searchParams.set('email', email);
    }
    if (role) {
      signupUrl.searchParams.set('role', role);
    }

    // Redirect to signup page with invitation parameters
    navigate(signupUrl.pathname + signupUrl.search, { replace: true });
  }, [navigate, searchParams]);

  return null;
}
