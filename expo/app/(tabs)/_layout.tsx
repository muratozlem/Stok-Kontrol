import { Tabs } from "expo-router";
import { LayoutDashboard, Package, Warehouse, ArrowLeftRight, Settings, FileText } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

export default function MainTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: [
          tabStyles.bar,
          {
            height: 60 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
        tabBarLabelStyle: tabStyles.label,
        tabBarItemStyle: tabStyles.item,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <LayoutDashboard color={color} size={focused ? 22 : 21} strokeWidth={focused ? 2.4 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Ürünler",
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <Package color={color} size={focused ? 22 : 21} strokeWidth={focused ? 2.4 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="warehouses"
        options={{
          title: "Depolar",
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <Warehouse color={color} size={focused ? 22 : 21} strokeWidth={focused ? 2.4 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "İşlemler",
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <ArrowLeftRight color={color} size={focused ? 22 : 21} strokeWidth={focused ? 2.4 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Rapor",
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <FileText color={color} size={focused ? 22 : 21} strokeWidth={focused ? 2.4 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ayarlar",
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <Settings color={color} size={focused ? 22 : 21} strokeWidth={focused ? 2.4 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.borderLight,
    borderTopWidth: 1,
    elevation: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    paddingTop: 6,
  },
  item: {
    paddingTop: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30,
    borderRadius: 12,
  },
  iconWrapActive: {
    backgroundColor: Colors.primaryVeryLight,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700' as const,
    marginTop: 1,
    letterSpacing: 0.1,
  },
});
