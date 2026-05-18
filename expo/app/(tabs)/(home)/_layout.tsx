import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

export default function DashboardStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerShadowVisible: false,
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Stok Kontrol",
          headerTitleStyle: {
            fontWeight: "800" as const,
            fontSize: 18,
            color: Colors.primary,
          },
        }}
      />
    </Stack>
  );
}
