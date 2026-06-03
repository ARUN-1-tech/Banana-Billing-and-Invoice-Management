import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Set default base URL for API requests
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://banana-backend-6bia.onrender.com/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('banana_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Configure axios authorization header on token change
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [token]);

  // Load user profile on mount if token is present
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get('/auth/profile/');
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user profile', error);
          // If token is invalid or expired
          if (error.response && error.response.status === 401) {
            logout();
          }
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, [token]);

  // Setup Axios interceptor to catch global 401s
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (usernameOrEmail, password) => {
    try {
      const response = await axios.post('/auth/login/', {
        username: usernameOrEmail,
        password: password
      });
      const { access, user: userData } = response.data;
      localStorage.setItem('banana_token', access);
      setToken(access);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error.response?.data || error.message || 'Login failed';
    }
  };

  const signup = async (signupData) => {
    try {
      const response = await axios.post('/auth/signup/', signupData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message || 'Signup failed';
    }
  };

  const logout = () => {
    localStorage.removeItem('banana_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Idle timeout tracking: 1 hour (3600000 ms) of user inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const timeoutDuration = 3600000; // 1 hour in ms
    let timer;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
        window.location.href = '/login?reason=timeout';
      }, timeoutDuration);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.patch('/auth/profile/', profileData);
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message || 'Profile update failed';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
