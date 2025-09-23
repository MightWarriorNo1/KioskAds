import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Special handling for admin - ensure admin always goes to admin portal
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }
      
      switch (user.role) {
        case 'host':
          navigate('/host', { replace: true });
          break;
        case 'designer':
          navigate('/designer', { replace: true });
          break;
        default:
          navigate('/client', { replace: true });
      }
    }
  }, [user, navigate]);

  return null;
}
