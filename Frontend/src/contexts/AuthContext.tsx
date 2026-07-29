'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AuthTokens, LoginRequest } from '@/types';
import { authApi } from '@/lib/api';
import api from '@/lib/api'; // import the Axios instance

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // attach token manually for first request
          const response = await api.get('/api/auth/user/', {
            headers: { Authorization: `Token ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user profile', error);
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

const login = async (credentials: LoginRequest) => {
  try {
    const response = await authApi.login(credentials);
    const tokens: AuthTokens = response.data;

    localStorage.setItem('token', tokens.token);

    // fetch profile with token
    const profileResponse = await authApi.getProfile();
    setUser(profileResponse.data);

    return profileResponse.data; // <-- return user data
  } catch (error) {
    console.error('Login failed', error);
    throw error;
  }
};


  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
