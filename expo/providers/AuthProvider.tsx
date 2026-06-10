import React, { useEffect, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { hashPassword } from '@/utils/hashPassword';

export interface AppUser {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const SESSION_KEY = 'stokapp_session';

function generateUuid(): string {
  const hex = '0123456789abcdef';
  const randHex = (len: number) =>
    Array.from({ length: len }, () => hex[Math.floor(Math.random() * 16)]).join('');
  const s1 = randHex(8);
  const s2 = randHex(4);
  const s3 = '4' + randHex(3);
  const yChars = '89ab';
  const s4 = yChars[Math.floor(Math.random() * 4)] + randHex(3);
  const s5 = randHex(12);
  return `${s1}-${s2}-${s3}-${s4}-${s5}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const stored = await AsyncStorage.getItem(SESSION_KEY);
        if (!stored) {
          console.log('[Auth] No stored session');
          return;
        }

        const sessionUser: AppUser = JSON.parse(stored);
        console.log('[Auth] Restoring session for:', sessionUser.email);

        if (!isSupabaseConfigured) {
          if (mounted) setCurrentUser(sessionUser);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .maybeSingle();

        if (error || !profile) {
          console.log('[Auth] Session user not found in DB, clearing');
          await AsyncStorage.removeItem(SESSION_KEY);
          return;
        }

        const user = rowToUser(profile);
        if (user.status !== 'approved' && user.role !== 'admin') {
          console.log('[Auth] User not approved anymore, clearing');
          await AsyncStorage.removeItem(SESSION_KEY);
          return;
        }

        if (mounted) {
          setCurrentUser(user);
          console.log('[Auth] Session restored:', user.email);
        }
      } catch (e) {
        console.log('[Auth] Session restore error:', e);
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase bağlantısı yapılandırılmamış');
      }

      const cleanEmail = email.trim().toLowerCase();

      if (!isValidEmail(cleanEmail)) {
        throw new Error('Geçerli bir e-posta adresi giriniz');
      }

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        throw new Error('Bu e-posta adresi zaten kayıtlı');
      }

      const passwordHash = hashPassword(password);

      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      const isFirstUser = !count || count === 0;
      const role: 'admin' | 'user' = isFirstUser ? 'admin' : 'user';
      const status: 'pending' | 'approved' = isFirstUser ? 'approved' : 'pending';

      const id = generateUuid();
      const username = cleanEmail.split('@')[0] ?? cleanEmail;

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id,
          email: cleanEmail,
          username,
          password_hash: passwordHash,
          role,
          status,
        });

      if (insertError) {
        console.log('[Auth] Profile insert error:', insertError);
        if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          throw new Error('Bu e-posta adresi zaten kayıtlı');
        }
        throw new Error('Kayıt oluşturulamadı: ' + insertError.message);
      }

      const user: AppUser = {
        id,
        email: cleanEmail,
        username,
        role,
        status,
        createdAt: new Date().toISOString(),
      };

      if (isFirstUser) {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
        console.log('[Auth] İlk kullanıcı admin olarak kayıt edildi:', user.email);
      } else {
        console.log('[Auth] Kayıt talebi oluşturuldu, admin onayı bekleniyor:', user.email);
      }
      return user;
    },
    onSuccess: (user) => {
      if (user.status === 'approved') {
        setCurrentUser(user);
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase bağlantısı yapılandırılmamış');
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        throw new Error('Geçerli bir e-posta adresi giriniz');
      }

      const passwordHash = hashPassword(password);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .eq('password_hash', passwordHash)
        .maybeSingle();

      if (error) {
        console.log('[Auth] Login query error:', error.message);
        if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed')) {
          throw new Error('Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.');
        }
        throw new Error('Giriş hatası: ' + error.message);
      }

      if (!profile) {
        throw new Error('E-posta veya şifre hatalı');
      }

      const user = rowToUser(profile);

      if (user.role !== 'admin') {
        if (user.status === 'pending') {
          throw new Error('Hesabınız henüz admin tarafından onaylanmadı.');
        }
        if (user.status === 'rejected') {
          throw new Error('Üyelik talebiniz reddedildi.');
        }
      }

      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
      console.log('[Auth] Giriş başarılı:', user.email);
      return user;
    },
    onSuccess: (user) => {
      setCurrentUser(user);
    },
  });

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
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
