import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// Logout karke login page par le jata hai (navbar aur sidebar dono isse use karte hain).
export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);
}
