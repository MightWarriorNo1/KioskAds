import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [fallbackTimeout, setFallbackTimeout] = useState(false);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('ProtectedRoute: Fallback timeout triggered');
        setFallbackTimeout(true);
      }, 15000); // 15 second fallback timeout

      return () => clearTimeout(timeout);
    } else {
      setFallbackTimeout(false);
    }
  }, [isLoading]);

  // If loading for too long, show error or redirect
  if (isLoading && fallbackTimeout) {
    console.log('ProtectedRoute: Fallback timeout reached, redirecting to signin');
    return <Navigate to="/signin" replace />;
  }

  if (isLoading) {
    return (
      <LoadingSpinner 
        size="lg" 
        text="Authenticating..." 
        fullScreen 
      />
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to user's appropriate portal based on their role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'host':
        return <Navigate to="/host" replace />;
      default:
        return <Navigate to="/client" replace />;
    }
  }

  return <>{children}</>;
}