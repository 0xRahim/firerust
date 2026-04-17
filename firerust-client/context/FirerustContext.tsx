'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const FirerustContext = createContext<any>({});

export function FirerustProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectId] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [token, setToken] = useState('');

  // Hydrate from localStorage on mount
  useEffect(() => {
    setProjectId(localStorage.getItem('fr_pid') || '');
    setAdminKey(localStorage.getItem('fr_admin') || '');
    setToken(localStorage.getItem('fr_token') || '');
  }, []);

  const updateProjectId = (id: string) => {
    setProjectId(id);
    localStorage.setItem('fr_pid', id);
  };

  const updateAdminKey = (key: string) => {
    setAdminKey(key);
    localStorage.setItem('fr_admin', key);
  };

  const updateToken = (t: string) => {
    setToken(t);
    localStorage.setItem('fr_token', t);
  };

  return (
    <FirerustContext.Provider value={{ 
      projectId, updateProjectId, 
      adminKey, updateAdminKey, 
      token, updateToken 
    }}>
      {children}
    </FirerustContext.Provider>
  );
}

export const useFirerust = () => useContext(FirerustContext);