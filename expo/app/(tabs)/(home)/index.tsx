import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Package,
  AlertTriangle,
  Warehouse,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  MapPin,
  Shield,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';
import StatCard from '@/components/StatCard';
import TransactionRow from '@/components/TransactionRow';
import EmptyState from '@/components/EmptyState';

const BLUE   = '#3ABEDB';
const GREEN  = '#7DC242';
const ORANGE = '#F07D28';
const RED    = '#E04B3C';

export default function DashboardPage() {
  const {
    products,
    warehouses,
    transactions,
    isLoading,
    getLowStockProducts,
    getTodayTransactionCount,
    locations,
  } = useData();
  const { currentUser } = useAuth();

  const locationName = useMemo(() => {
    if (!currentUser?.locationId) return null;
    return locations.find(l => l.id === currentUser.locationId)?.name ?? null;
  }, [currentUser?.locationId, locations]);

  const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Süper Admin',
    admin: 'İdari İşler',
    chef: 'Şef',
    staff: 'Personel',
  };
  const roleLabel = currentUser?.role ? (ROLE_LABELS[currentUser.role] ?? currentUser.role) : null;

  const lowStockProducts = useMemo(() => getLowStockProducts(), [getLowStockProducts]);
  const todayCount = useMemo(() => getTodayTransactionCount(), [getTodayTransactionCount]);
  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleStockIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/stock-transaction?type=IN');
  }, []);

  const handleStockOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/stock-transaction?type=OUT');
  }, []);

  const handleCriticalStock = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/critical-stock');
  }, []);

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const getWarehouse = useCallback(
    (id: string) => warehouses.find((w) => w.id === id),
    [warehouses]
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 'İyi geceler';
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  }, []);

  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    []
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ORANGE}
            colors={[ORANGE]}
          />
        }
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.greetingSection,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.colorAccentBar}>
            <View style={[styles.colorAccent, { backgroundColor: BLUE }]} />
            <View style={[styles.colorAccent, { backgroundColor: GREEN }]} />
            <View style={[styles.colorAccent, { backgroundColor: '#F5C225' }]} />
            <View style={[styles.colorAccent, { backgroundColor: ORANGE }]} />
          </View>
          <View style={styles.greetingTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingLabel}>{greeting},</Text>
              <Text style={styles.greetingName}>
                {currentUser?.username ?? 'Kullanıcı'}
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Canlı</Text>
            </View>
          </View>
          <Text style={styles.greetingSubtitle}>{dateStr}</Text>
          {(roleLabel || locationName) && (
            <View style={styles.userInfoRow}>
              {roleLabel && (
                <View style={styles.roleChip}>
                  <Shield size={11} color={Colors.primary} strokeWidth={2.4} />
                  <Text style={styles.roleChipText}>{roleLabel}</Text>
                </View>
              )}
              {locationName && (
                <View style={styles.locationChip}>
                  <MapPin size={11} color={ORANGE} strokeWidth={2.4} />
                  <Text style={styles.locationChipText}>{locationName}</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <StatCard
            icon={<Package size={20} color={ORANGE} strokeWidth={2.4} />}
            label="Toplam Ürün"
            value={products.length}
            color={ORANGE}
            bgColor={Colors.primaryVeryLight}
          />
          <View style={styles.statSpacer} />
          <StatCard
            icon={<AlertTriangle size={20} color={RED} strokeWidth={2.4} />}
            label="Kritik Stok"
            value={lowStockProducts.length}
            color={RED}
            bgColor={Colors.dangerLight}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon={<Warehouse size={20} color={BLUE} strokeWidth={2.4} />}
            label="Depo Sayısı"
            value={warehouses.length}
            color={BLUE}
            bgColor={Colors.infoLight}
          />
          <View style={styles.statSpacer} />
          <StatCard
            icon={<ArrowLeftRight size={20} color={GREEN} strokeWidth={2.4} />}
            label="Bugün İşlem"
            value={todayCount}
            color={GREEN}
            bgColor={Colors.successLight}
          />
        </View>

        {/* Critical Stock Banner */}
        {lowStockProducts.length > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={handleCriticalStock}
            activeOpacity={0.85}
            testID="critical-stock-banner"
          >
            <View style={styles.alertIconWrap}>
              <AlertTriangle size={20} color={ORANGE} strokeWidth={2.4} />
            </View>
            <View style={styles.alertTextWrap}>
              <Text style={styles.alertTitle}>Kritik Stok Uyarısı</Text>
              <Text style={styles.alertSubtitle}>
                {lowStockProducts.length} ürün minimum seviyenin altında
              </Text>
            </View>
            <View style={styles.alertChevron}>
              <ChevronRight size={18} color={ORANGE} />
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsHeader}>
          <Text style={styles.sectionTitle}>Hızlı İşlem</Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleStockIn}
            activeOpacity={0.85}
            testID="stock-in-btn"
          >
            <LinearGradient
              colors={['#5DC85D', GREEN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtnGradient}
            >
              <View style={styles.actionIconCircle}>
                <ArrowDownLeft size={22} color={Colors.white} strokeWidth={2.6} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionBtnTitle}>Stok Girişi</Text>
                <Text style={styles.actionBtnSubtitle}>Ürün ekle</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.actionSpacer} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleStockOut}
            activeOpacity={0.85}
            testID="stock-out-btn"
          >
            <LinearGradient
              colors={['#F0724A', RED]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtnGradient}
            >
              <View style={styles.actionIconCircle}>
                <ArrowUpRight size={22} color={Colors.white} strokeWidth={2.6} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionBtnTitle}>Stok Çıkışı</Text>
                <Text style={styles.actionBtnSubtitle}>Ürün düş</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Son İşlemler</Text>
            <Text style={styles.sectionSubtitle}>
              {transactions.length} toplam işlem
            </Text>
          </View>
          {transactions.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/transactions')}
              style={styles.seeAllBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAll}>Tümü</Text>
              <ChevronRight size={14} color={ORANGE} />
            </TouchableOpacity>
          )}
        </View>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={32} color={ORANGE} />}
            title="Henüz işlem yok"
            subtitle="Stok girişi veya çıkışı yaparak başlayın"
          />
        ) : (
          <View style={styles.transactionsCard}>
            {recentTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                product={getProduct(tx.productId)}
                warehouse={getWarehouse(tx.warehouseId)}
              />
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },

  greetingSection: {
    marginBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    paddingTop: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  colorAccentBar: {
    flexDirection: 'row',
    marginBottom: 14,
    marginHorizontal: -18,
    marginTop: -14,
    height: 4,
  },
  colorAccent: { flex: 1 },
  greetingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5D6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.successLight,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  liveBadgeText: {
    fontSize: 11,
    color: GREEN,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'capitalize' as const,
  },
  userInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEE8F8',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0BCF0',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#7B2FBE',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E8',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD4AA',
  },
  locationChipText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: ORANGE,
  },

  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statSpacer: { width: 12 },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    marginTop: 2,
    borderWidth: 1.5,
    borderColor: '#FFE3CC',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  alertIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertTextWrap: { flex: 1 },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: ORANGE,
    marginBottom: 2,
  },
  alertSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  alertChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickActionsHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 26,
  },
  actionSpacer: { width: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    ...(Platform.OS === 'web' ? { height: 76 } : {}),
  },
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  actionBtnTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
  },
  actionBtnSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primaryVeryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE3CC',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: ORANGE,
  },

  transactionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  bottomSpacer: { height: 40 },
});
