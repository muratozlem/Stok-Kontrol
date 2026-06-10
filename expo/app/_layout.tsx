import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { LogBox, ActivityIndicator, View, StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DataProvider } from "@/providers/DataProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import Colors from "@/constants/colors";

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

const authStyles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});

function RootLayoutNav() {
  return (
    <>
      <AuthGate />
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
