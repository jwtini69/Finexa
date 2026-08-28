import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../api/client';
import { loginUser, registerOrg, getCurrentOrg } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgDetails = async () => {
    try {
      const orgData = await getCurrentOrg();
      setOrg(orgData);
    } catch (err) {
      console.warn('Could not fetch org details:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrgDetails().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      setOrg(null);
    };

    window.addEventListener('finexa:auth_expired', handleAuthExpired);
    return () => window.removeEventListener('finexa:auth_expired', handleAuthExpired);
  }, [token]);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    setToken(data.access_token);
    const userData = {
      id: data.user_id,
      organizationId: data.organization_id,
      email: data.email,
      role: data.role,
    };
    setUser(userData);
    await fetchOrgDetails();
    return data;
  };

  const register = async (organizationName, ownerEmail, password) => {
    await registerOrg(organizationName, ownerEmail, password);
    return login(ownerEmail, password);
  };

  const logout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setToken(null);
    setUser(null);
    setOrg(null);
  };

  const quickLogin = async (roleType = 'owner') => {
    const emailMap = {
      owner: 'owner@finexa.dev',
      admin: 'admin@finexa.dev',
      viewer: 'viewer@finexa.dev',
    };
    const email = emailMap[roleType] || 'owner@finexa.dev';
    return login(email, 'password');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        org,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        quickLogin,
        refreshOrg: fetchOrgDetails,
      }}
    >
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
