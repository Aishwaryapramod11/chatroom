import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChangedListener((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const loggedUser = await authService.signIn(email, password);
      setUser(loggedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password, avatarUrl) => {
    setLoading(true);
    try {
      const newUser = await authService.signUp(username, email, password, avatarUrl);
      setUser(newUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const loginAnonymous = async (username, avatarUrl) => {
    setLoading(true);
    try {
      const anonUser = await authService.signInAnonymously(username, avatarUrl);
      setUser(anonUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (newUsername, newAvatarUrl) => {
    try {
      const updatedUser = await authService.updateUserProfile(user, newUsername, newAvatarUrl);
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginAnonymous,
        logout,
        updateProfile
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
