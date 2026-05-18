import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Database,
  Package,
  Warehouse,
  ArrowLeftRight,
  Shield,
  ChevronRight,
  LogOut,
  Info,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';

export default function SettingsPage() {
  const { products, warehouses, transactions } = useData();
  const { currentUser, isAdmin, logout } = useAuth();

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Çıkış Yap',
      'Oturumunuz kapatılacak. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            logout();
          },
        },
      ]
    );
  }, [logout]);

  const goToAdmin = useCallback(() => {
    router.push('/admin');
  }, []);

  const initials = (currentUser?.username ?? currentUser?.email ?? 'U').charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCard}
      >
        <View style={styles.profileDeco} />
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {currentUser?.email ?? 'Kullanıcı'}
          </Text>
          <View style={styles.profileBadge}>
            <Shield size={11} color={Colors.white} strokeWidth={2.4} />
            <Text style={styles.profileRole}>
              {isAdmin ? 'Yönetici' : 'Kullanıcı'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.quickStatsRow}>
        <View style={styles.quickStat}>
          <View style={[styles.qsIconWrap, { backgroundColor: Colors.primaryVeryLight }]}>
            <Package size={16} color={Colors.primary} strokeWidth={2.4} />
          </View>
          <Text style={styles.qsValue}>{products.length}</Text>
          <Text style={styles.qsLabel}>Ürün</Text>
        </View>
        <View style={styles.quickStat}>
          <View style={[styles.qsIconWrap, { backgroundColor: Colors.infoLight }]}>
            <Warehouse size={16} color={Colors.info} strokeWidth={2.4} />
          </View>
          <Text style={styles.qsValue}>{warehouses.length}</Text>
          <Text style={styles.qsLabel}>Depo</Text>
        </View>
        <View style={styles.quickStat}>
          <View style={[styles.qsIconWrap, { backgroundColor: Colors.successLight }]}>
            <ArrowLeftRight size={16} color={Colors.success} strokeWidth={2.4} />
          </View>
          <Text style={styles.qsValue}>{transactions.length}</Text>
          <Text style={styles.qsLabel}>İşlem</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>SİSTEM</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Database size={18} color={Colors.primary} strokeWidth={2.3} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Supabase Bulut</Text>
            <Text style={styles.infoSubtitle}>
              Veriler bulutta gerçek zamanlı saklanır
            </Text>
          </View>
          <View style={styles.statusDot} />
        </View>
      </View>

      {isAdmin && (
        <>
          <Text style={styles.sectionLabel}>YÖNETİM</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={goToAdmin}
              activeOpacity={0.7}
              testID="admin-panel-btn"
            >
              <View style={styles.adminIconWrap}>
                <ShieldCheck size={18} color={Colors.primary} strokeWidth={2.3} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Admin Paneli</Text>
                <Text style={styles.infoSubtitle}>
                  Üyelik talepleri, kullanıcı ve veri yönetimi
                </Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>HESAP</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleLogout}
          activeOpacity={0.7}
          testID="logout-btn"
        >
          <View style={styles.logoutIconWrap}>
            <LogOut size={18} color={Colors.primary} strokeWidth={2.3} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.logoutTitle}>Çıkış Yap</Text>
            <Text style={styles.infoSubtitle}>Oturumu sonlandır</Text>
          </View>
          <ChevronRight size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.appInfo}>
        <View style={styles.appIconCircle}>
          <Info size={18} color={Colors.primary} strokeWidth={2.3} />
        </View>
        <Text style={styles.appName}>Stok Kontrol</Text>
        <Text style={styles.appVersion}>Sürüm 1.0.0</Text>
        <View style={styles.creditDivider} />
        <Text style={styles.creditLabel}>BUILT & DESIGNED BY</Text>
        <Text style={styles.creditName}>Murat KARAGÖZ</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 60 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 22,
    marginBottom: 16,
    marginTop: 4,
    gap: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  profileDeco: {
    position: 'absolute' as const,
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontSize: 24, fontWeight: '800' as const, color: Colors.white, letterSpacing: -0.5 },
  profileInfo: { flex: 1, gap: 6 },
  profileName: { fontSize: 17, fontWeight: '800' as const, color: Colors.white, letterSpacing: -0.3 },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start' as const,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  profileRole: { fontSize: 11, fontWeight: '700' as const, color: Colors.white, letterSpacing: 0.3 },
  quickStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  quickStat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  qsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qsValue: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  qsLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const, marginTop: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  infoSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  logoutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  adminIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appInfo: { alignItems: 'center', marginTop: 36, paddingBottom: 10 },
  appIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appName: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  appVersion: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  creditDivider: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.primary,
    opacity: 0.5,
    marginTop: 14,
    marginBottom: 10,
  },
  creditLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: 3,
  },
  creditName: { fontSize: 13, fontWeight: '700' as const, color: Colors.primary, letterSpacing: 0.3 },
});
