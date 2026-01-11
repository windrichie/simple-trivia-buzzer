'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing localStorage in a type-safe way
 * T117: Create hook with get/set/clear functions
 */

interface StoredCredentials {
  joinCode: string;
  nickname: string;
  password: string;
  savedAt: number;
}

const STORAGE_KEY = 'trivia-buzzer-credentials';

/**
 * Get stored credentials from localStorage
 */
export function useLocalStorage() {
  const [credentials, setCredentials] = useState<StoredCredentials | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load credentials on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredCredentials;
        setCredentials(parsed);
      }
    } catch (error) {
      console.error('[localStorage] Failed to load credentials:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  /**
   * Save credentials to localStorage
   */
  const saveCredentials = useCallback((data: Omit<StoredCredentials, 'savedAt'>) => {
    try {
      const toSave: StoredCredentials = {
        ...data,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setCredentials(toSave);
      console.log('[localStorage] Credentials saved');
    } catch (error) {
      console.error('[localStorage] Failed to save credentials:', error);
    }
  }, []);

  /**
   * Clear saved credentials
   */
  const clearCredentials = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setCredentials(null);
      console.log('[localStorage] Credentials cleared');
    } catch (error) {
      console.error('[localStorage] Failed to clear credentials:', error);
    }
  }, []);

  /**
   * Check if credentials are recent (within last 24 hours)
   */
  const areCredentialsRecent = useCallback(() => {
    if (!credentials) return false;
    const hoursSinceSaved = (Date.now() - credentials.savedAt) / (1000 * 60 * 60);
    return hoursSinceSaved < 24;
  }, [credentials]);

  return {
    credentials,
    isLoaded,
    saveCredentials,
    clearCredentials,
    areCredentialsRecent,
  };
}
