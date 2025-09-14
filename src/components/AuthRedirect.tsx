import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'host':
          navigate('/host', { replace: true });
          break;
        default:
          navigate('/client', { replace: true });
      }
    }
  }, [user, navigate]);

  return null;
}
