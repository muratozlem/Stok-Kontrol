import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { LogBox, ActivityIndicator, View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DataProvider } from "@/providers/DataProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import Colors from "@/constants/colors";
import { Clock, LogOut, ShieldCheck } from "lucide-react-native";

LogBox.ignoreLogs(["Setting a timer", "AsyncStorage"]);
SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class PatchedResizeObserver extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (_) {}
        });
      });
    }
  };

  window.addEventListener('error', (e) => {
    if (e.message?.includes('ResizeObserver')) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
    }
  });

  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('ResizeObserver')) return;
    origConsoleError(...args);
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

function AuthGate() {
  const { isLoggedIn, isReady } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'forgot-password';

    if (!isLoggedIn && !inAuthGroup) {
      console.log('[AuthGate] No session, redirecting to register');
      router.replace('/register');
    } else if (isLoggedIn && inAuthGroup) {
      console.log('[AuthGate] Session found, redirecting to home');
      router.replace('/');
    }
  }, [isLoggedIn, isReady, segments]);

  if (!isReady) {
    return (
      <View style={authStyles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return null;
}

function PendingGate() {
  const { isPending, currentUser, logout } = useAuth();

  if (!isPending) return null;

  return (
    <View style={pendingStyles.overlay}>
      <View style={pendingStyles.card}>
        <View style={pendingStyles.iconWrap}>
          <Clock size={40} color={Colors.primary} strokeWidth={1.8} />
        </View>
        <View style={pendingStyles.badgeRow}>
          <ShieldCheck size={14} color={Colors.primary} strokeWidth={2.2} />
          <Text style={pendingStyles.badgeText}>Onay Bekleniyor</Text>
        </View>
        <Text style={pendingStyles.title}>Yöneticinizden{'\n'}onay bekliyorsunuz</Text>
        <Text style={pendingStyles.subtitle}>
          Hesabınız henüz onaylanmadı. Yöneticiniz hesabınızı onayladıktan sonra uygulamaya erişebilirsiniz.
        </Text>
        {currentUser?.email ? (
          <View style={pendingStyles.emailRow}>
            <Text style={pendingStyles.emailLabel}>Kayıtlı e-posta</Text>
            <Text style={pendingStyles.emailValue}>{currentUser.email}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={pendingStyles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <LogOut size={16} color={Colors.textSecondary} strokeWidth={2.2} />
          <Text style={pendingStyles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const authStyles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});

const pendingStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F6F8FB',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 30,
    alignItems: 'center',
    width: '100%' as const,
    maxWidth: 420,
    shadowColor: '#1A1D2E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: Colors.primarySoft,
  },
  badgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryVeryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
    marginBottom: 24,
  },
  emailRow: {
    width: '100%' as const,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emailLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700' as const,
  },
  logoutBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});

function RootLayoutNav() {
  return (
    <>
      <AuthGate />
      <PendingGate />
      <Stack
        screenOptions={{
          headerBackTitle: "Geri",
          headerTintColor: Colors.primary,
          contentStyle: { backgroundColor: Colors.background },
          headerTitleStyle: {
            fontWeight: "600" as const,
            fontSize: 17,
            color: Colors.text,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen
          name="admin"
          options={{
            title: "Admin Paneli",
            headerStyle: { backgroundColor: Colors.white },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="product-detail"
          options={{
            title: "Ürün Detayı",
            headerStyle: { backgroundColor: Colors.white },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="warehouse-detail"
          options={{
            title: "Depo Detayı",
            headerStyle: { backgroundColor: Colors.white },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="add-product"
          options={{
            presentation: "modal",
            title: "Yeni Ürün",
            headerStyle: { backgroundColor: Colors.white },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="add-warehouse"
          options={{
            presentation: "modal",
            title: "Yeni Depo",
            headerStyle: { backgroundColor: Colors.white },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="stock-transaction"
          options={{
            presentation: "modal",
            title: "Stok İşlemi",
            headerStyle: { backgroundColor: Colors.white },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="critical-stock"
          options={{
            title: "Kritik Stok Uyarıları",
            headerStyle: { backgroundColor: Colors.white },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="barcode-scanner"
          options={{ presentation: "fullScreenModal", headerShown: false }}
        />
        <Stack.Screen
          name="camera-capture"
          options={{ presentation: "fullScreenModal", headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log("[App] Stok Kontrol v1.0 starting");
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={rootStyles.flex}>
        <AuthProvider>
          <DataProvider>
            <StatusBar style="dark" />
            <RootLayoutNav />
          </DataProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const rootStyles = StyleSheet.create({
  flex: { flex: 1 },
});
