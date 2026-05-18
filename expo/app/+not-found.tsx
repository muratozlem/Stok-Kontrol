import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import Colors from "@/constants/colors";

export default function NotFoundPage() {
  return (
    <>
      <Stack.Screen options={{ title: "Sayfa Bulunamadı", headerShown: true }} />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <AlertCircle size={36} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Sayfa bulunamadı</Text>
        <Text style={styles.description}>
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </Text>
        <Link href="/" style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Ana Sayfaya Dön</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: Colors.background,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 280,
  },
  homeButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  homeButtonText: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: "700" as const,
  },
});
