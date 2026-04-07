import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { DbUserProfile, UserRole } from './supabase';
import { can, canRead, canWrite, canDelete } from './db/rbac';
import type { Module } from './db/rbac';

/* ──────────────────────────────────────────────────
   Types
────────────────────────────────────────────────── */
interface AuthState {
  user: User | null;
  session: Session | null;
  profile: DbUserProfile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, meta: { first_name: string; last_name: string }) => Promise<{ error: string | null; needsEmailConfirm: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Permission helpers
  can: (module: Module, action: 'read' | 'write' | 'delete') => boolean;
  canRead: (module: Module) => boolean;
  canWrite: (module: Module) => boolean;
  canDelete: (module: Module) => boolean;
  role: UserRole | null;
  hasCompany: boolean;
  onboardingCompleted: boolean;
}

/* ──────────────────────────────────────────────────
   Context
────────────────────────────────────────────────── */
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  /* Load profile from DB */
  async function loadProfile(userId: string): Promise<DbUserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) { console.error('[auth] loadProfile', error); return null; }
    return data;
  }

  async function refreshProfile() {
    if (!state.user) return;
    const profile = await loadProfile(state.user.id);
    setState(s => ({ ...s, profile }));
  }

  /* Bootstrap session */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session?.user ? await loadProfile(session.user.id) : null;
      setState({ user: session?.user ?? null, session, profile, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const profile = session?.user ? await loadProfile(session.user.id) : null;
        setState({ user: session?.user ?? null, session, profile, loading: false });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /* Auth actions */
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(
    email: string,
    password: string,
    meta: { first_name: string; last_name: string },
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    // If session is returned, email confirmation is disabled — user is already signed in
    return { error: error?.message ?? null, needsEmailConfirm: !data.session && !error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setState({ user: null, session: null, profile: null, loading: false });
  }

  /* Permission bindings */
  const role = state.profile?.role ?? null;

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    role,
    hasCompany: !!state.profile?.company_id,
    onboardingCompleted: state.profile?.onboarding_completed ?? false,
    can: (module, action) => role ? can(role, module, action) : false,
    canRead: (module) => role ? canRead(role, module) : false,
    canWrite: (module) => role ? canWrite(role, module) : false,
    canDelete: (module) => role ? canDelete(role, module) : false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ──────────────────────────────────────────────────
   Hook
────────────────────────────────────────────────── */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
