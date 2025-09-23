import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const handle = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!isMounted) return;
      if (user) {
        // Fetch role from profiles table (same logic as AuthContext)
        let role: 'client' | 'host' | 'designer' | 'admin' = (user.user_metadata?.role as 'client' | 'host' | 'designer' | 'admin') || 'client';
        
        // Check localStorage for admin role preservation
        const storedRole = localStorage.getItem('user_role') as 'client' | 'host' | 'designer' | 'admin';
        if (storedRole === 'admin') {
          role = 'admin';
        }
        
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (!error && profile && (profile as any).role) {
            role = (profile as any).role as 'client' | 'host' | 'designer' | 'admin';
          }
        } catch (_e) {
          // Keep the metadata role if profile lookup fails - don't downgrade to 'client'
          console.warn('Profile lookup failed in AuthCallback, using metadata role:', role);
        }
        
        // Final safety check - never downgrade from admin
        if (storedRole === 'admin') {
          role = 'admin';
        }

        switch (role) {
          case 'host':
            navigate('/host', { replace: true });
            break;
          case 'designer':
            navigate('/designer', { replace: true });
            break;
          case 'admin':
            navigate('/admin', { replace: true });
            break;
          default:
            navigate('/client', { replace: true });
        }
      } else {
        navigate('/signin', { replace: true });
      }
    };
    handle();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Signing you in...</div>
    </div>
  );
}


