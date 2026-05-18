import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

export default function ReportsNavLayout() {
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
          title: "Raporlar",
          headerTitleStyle: {
            fontWeight: "700" as const,
            fontSize: 18,
            color: Colors.text,
          },
        }}
      />
    </Stack>
  );
}
