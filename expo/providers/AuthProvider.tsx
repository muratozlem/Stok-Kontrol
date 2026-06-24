import React, { useEffect, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

export interface AppUser {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

function rowToUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id ?? ''),
    email: String(row.email ?? ''),
    username: String(row.username ?? row.email ?? ''),
    role: (row.role as 'admin' | 'user') ?? 'user',
    status: (row.status as 'pending' | 'approved' | 'rejected') ?? 'approved',
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const loadProfile = useCallback(async (userId: string): Promise<AppUser | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return rowToUser(data);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsReady(true);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        if (profile && (profile.status === 'approved' || profile.role === 'admin')) {
          setCurrentUser(profile);
        } else {
          await supabase.auth.signOut();
        }
      }
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase bağlantısı yapılandırılmamış');
      }

      const cleanEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error('Geçerli bir e-posta adresi giriniz');
      }
      if (/[%_\\]/.test(cleanEmail)) {
        throw new Error('E-posta adresi geçersiz karakter içeriyor');
      }
      if (password.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalı');
      }

      const { data, error } = await supabase.functions.invoke('register-user', {
        body: { email: cleanEmail, password },
      });

      if (error) throw new Error(error.message ?? 'Kayıt oluşturulamadı');
      if (data?.error) throw new Error(data.error);

      const status = data.status as 'pending' | 'approved';

      if (status === 'approved') {
        const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInErr || !authData.user) throw new Error('Giriş yapılamadı');
        const profile = await loadProfile(authData.user.id);
        if (profile) setCurrentUser(profile);
      }

      console.log('[Auth] Kayıt tamamlandı, durum:', status);
      return { status, email: cleanEmail };
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase bağlantısı yapılandırılmamış');
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error('Geçerli bir e-posta adresi giriniz');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        if (
          authError.message?.includes('Invalid login credentials') ||
          authError.message?.includes('invalid_credentials')
        ) {
          throw new Error('E-posta veya şifre hatalı');
        }
        if (authError.message?.includes('fetch') || authError.message?.includes('network')) {
          throw new Error('Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.');
        }
        throw new Error('Giriş hatası: ' + authError.message);
      }

      if (!authData.user) throw new Error('Giriş başarısız');

      const profile = await loadProfile(authData.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Kullanıcı profili bulunamadı');
      }

      if (profile.role !== 'admin') {
        if (profile.status === 'pending') {
          await supabase.auth.signOut();
          throw new Error('Hesabınız henüz admin tarafından onaylanmadı.');
        }
        if (profile.status === 'rejected') {
          await supabase.auth.signOut();
          throw new Error('Üyelik talebiniz reddedildi.');
        }
      }

      console.log('[Auth] Giriş başarılı:', profile.email);
      return profile;
    },
    onSuccess: (user) => {
      setCurrentUser(user);
    },
  });

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    console.log('[Auth] Çıkış yapıldı');
  }, []);

  const register = useCallback((email: string, password: string) => {
    return registerMutation.mutateAsync({ email, password });
  }, [registerMutation]);

  const login = useCallback((email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  return {
    currentUser,
    isReady,
    isLoggedIn: !!currentUser,
    isAdmin: currentUser?.role === 'admin',
    register,
    login,
    logout,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    registerError: registerMutation.error?.message ?? null,
    loginError: loginMutation.error?.message ?? null,
    resetRegisterError: registerMutation.reset,
    resetLoginError: loginMutation.reset,
  };
});
