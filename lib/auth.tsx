import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { Profile } from './types';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  passwordRecovery: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  endPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  passwordRecovery: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  endPasswordRecovery: () => {},
});

// Extrae los parámetros de auth que Supabase agrega al enlace de recuperación,
// ya sea en el fragmento (#) o en el query (?). Ej:
//   quiniela://reset-password#access_token=...&refresh_token=...&type=recovery
function parseAuthParams(url: string): Record<string, string> | null {
  if (!url) return null;
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  let raw = '';
  if (hashIndex >= 0) raw = url.substring(hashIndex + 1);
  else if (queryIndex >= 0) raw = url.substring(queryIndex + 1);
  else return null;

  const params: Record<string, string> = {};
  for (const pair of raw.split('&')) {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
  }
  return params;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Procesa el enlace de recuperación (deep link) que llega desde el correo:
  // establece la sesión con los tokens y marca el modo de recuperación.
  useEffect(() => {
    async function handleUrl(url: string | null) {
      const params = url ? parseAuthParams(url) : null;
      if (!params) return;

      if (params.access_token && params.refresh_token) {
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (params.type === 'recovery') setPasswordRecovery(true);
      }
    }

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setPasswordRecovery(false);
  }

  function endPasswordRecovery() {
    setPasswordRecovery(false);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        passwordRecovery,
        signOut,
        refreshProfile,
        endPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
