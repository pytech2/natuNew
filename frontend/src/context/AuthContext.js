import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Auto-logout after 10 minutes of inactivity
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export function AuthProvider({ children }) {
  // Instantly restore cached user to prevent flash-redirect on mobile camera return
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('cachedUser');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef(null);

  // Helper to update user + cache
  const setUserAndCache = useCallback((userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('cachedUser', JSON.stringify(userData));
    } else {
      localStorage.removeItem('cachedUser');
    }
  }, []);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Only set timer if user is logged in
    if (token) {
      idleTimerRef.current = setTimeout(() => {
        console.log('Session timeout - logging out due to inactivity');
        logout();
        alert('You have been logged out due to 10 minutes of inactivity.');
        window.location.href = '/login';
      }, IDLE_TIMEOUT);
    }
  }, [token]);

  // Set up activity listeners
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetIdleTimer();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Start the timer
    resetIdleTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        // If we already have cached user, stop loading immediately
        // This prevents redirect flash on mobile camera return
        const hasCachedUser = !!localStorage.getItem('cachedUser');
        if (hasCachedUser) {
          setLoading(false);
        }
        
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUserAndCache(response.data);
          setToken(savedToken);
        } catch (error) {
          // CRITICAL: Only clear auth on explicit 401/403 rejection from server
          // Network errors (timeout, offline) should NOT log user out
          // This prevents mobile camera return from killing the session
          const status = error?.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('cachedUser');
            setToken(null);
            setUser(null);
          }
          // On network error: keep cached user & token intact
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { username, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    
    // Fetch computed permissions from /auth/me
    try {
      const meResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      setUserAndCache(meResponse.data);
    } catch {
      setUserAndCache(userData);
    }
    
    resetIdleTimer();
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('cachedUser');
    setToken(null);
    setUser(null);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
