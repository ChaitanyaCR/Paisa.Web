'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ApiUser } from '@/lib/api';

const AuthUserContext = createContext<ApiUser | null>(null);

export function AuthUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setUser(body?.user ?? null))
      .catch(() => setUser(null));
  }, []);
  return (
    <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>
  );
}

export function useAuthUser() {
  return useContext(AuthUserContext);
}
