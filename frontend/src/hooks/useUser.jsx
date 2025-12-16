import { useState, useEffect, useRef } from 'react';
import { verifySession } from '../api/authAPI';

// How long we consider cached user data fresh before a silent re-verify (10 minutes)
const STALE_MS = 10 * 60 * 1000;

export default function useUser() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  // Track in-flight refresh so we don't spam verify calls
  const refreshingRef = useRef(false);

  useEffect(() => {
    function syncFromStorage() {
      try {
        const raw = localStorage.getItem('user');
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    }

    // Listen for cross-tab updates (logout/login in another tab)
    function handleStorage(e) {
      // Handle both cross-tab storage events and custom storage events
      if (!e.key || e.key === 'user') {
        syncFromStorage();
      }
    }
    
    // Listen for auth changes (login/logout/profile update)
    function handleAuthChange() {
      syncFromStorage();
    }
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth:change', handleAuthChange);

    // Stale check & silent refresh
    const lastRefreshed = Number(localStorage.getItem('user_last_refreshed')) || 0;
    const now = Date.now();
    if (user && now - lastRefreshed > STALE_MS && !refreshingRef.current) {
      // Skip refresh if offline - keep user logged in
      if (!navigator.onLine) {
        console.log('[useUser] Offline: Skipping session refresh');
        return;
      }
      
      refreshingRef.current = true;
      verifySession()
        .then((valid) => {
          if (valid) {
            localStorage.setItem('user_last_refreshed', String(Date.now()));
            syncFromStorage();
          } else {
            // Only logout if we got a clear rejection (not network error)
            if (navigator.onLine) {
              localStorage.removeItem('user');
              setUser(null);
            }
          }
        })
        .catch(() => {
          // Don't logout on network error
          if (navigator.onLine) {
            localStorage.removeItem('user');
            setUser(null);
          } else {
            console.log('[useUser] Offline: Keeping user logged in despite error');
          }
        })
        .finally(() => {
          refreshingRef.current = false;
        });
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth:change', handleAuthChange);
    };
  }, [user]);

  return user;
}