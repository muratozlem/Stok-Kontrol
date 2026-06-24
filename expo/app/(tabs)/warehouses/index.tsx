import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Warehouse as WarehouseIcon,
  MapPin,
  Package,
  ChevronRight,
  Boxes,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';
import EmptyState from '@/components/EmptyState';
import { Warehouse } from '@/types';

export default function WarehouseListPage() {
  const { warehouses, inventory } = useData();
  const { isAdmin } = useAuth();

  const warehouseStats = useMemo(() => {
    const stats: Record<string, { productCount: number; totalStock: number }> =
      {};
    for (const wh of warehouses) {
      const items = inventory.filter(
        (i) => i.warehouseId === wh.id && i.quantity > 0
      );
      stats[wh.id] = {
        productCount: items.length,
        totalStock: items.reduce((sum, i) => sum + i.quantity, 0),
      };
    }
    return stats;
  }, [warehouses, inventory]);

  const totalStockAll = useMemo(
    () => Object.values(warehouseStats).reduce((s, v) => s + v.totalStock, 0),
    [warehouseStats]
  );

  const handleAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-warehouse');
  }, []);

  const handleWarehouse = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/warehouse-detail?id=${id}`);
  }, []);

  const renderWarehouse = useCallback(
    ({ item, index }: { item: Warehouse; index: number }) => {
      const stat = warehouseStats[item.id] ?? {
        productCount: 0,
        totalStock: 0,
      };

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleWarehouse(item.id)}
          activeOpacity={0.85}
          testID={`warehouse-${item.id}`}
        >
          <LinearGradient
            colors={
              index % 2 === 0
                ? [Colors.gradientStart, Colors.gradientEnd]
                : [Colors.primaryDark, Colors.primary]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeader}
          >
            <View style={styles.cardHeaderPattern} />
            <View style={styles.iconWrap}>
              <WarehouseIcon size={22} color={Colors.white} strokeWidth={2.4} />
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.warehouseName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.location ? (
                <View style={styles.locationRow}>
                  <MapPin size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.chevronWrap}>
              <ChevronRight size={18} color={Colors.white} />
            </View>
          </LinearGradient>

          <View style={styles.cardBody}>
            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <View style={styles.statIconWrap}>
                  <Package size={14} color={Colors.info} strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.statValue}>{stat.productCount}</Text>
                  <Text style={styles.statLabel}>Ürün</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: Colors.primaryVeryLight }]}>
                  <Boxes size={14} color={Colors.primary} strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.statValue}>{stat.totalStock}</Text>
                  <Text style={styles.statLabel}>Stok</Text>
                </View>
              </View>
            </View>

            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [warehouseStats, handleWarehouse]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Depolar</Text>
            <Text style={styles.headerSubtitle}>
              {warehouses.length} depo · {totalStockAll} toplam stok
            </Text>
          </View>
        </View>
      </View>

      {warehouses.length === 0 ? (
        <EmptyState
          icon={<WarehouseIcon size={32} color={Colors.primary} />}
          title="Henüz depo yok"
          subtitle={isAdmin ? 'İlk deponuzu ekleyerek stok yönetimine başlayın' : 'Henüz size atanmış depo bulunmuyor'}
          actionLabel={isAdmin ? 'Depo Ekle' : undefined}
          onAction={isAdmin ? handleAdd : undefined}
        />
      ) : (
        <FlatList
          data={warehouses}
          keyExtractor={(item) => item.id}
          renderItem={renderWarehouse}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAdd}
          activeOpacity={0.9}
          testID="add-warehouse-btn"
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Plus size={26} color={Colors.white} strokeWidth={2.6} />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  separator: {
    height: 14,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  cardHeaderPattern: {
    position: 'absolute' as const,
    top: -40,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500' as const,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 14,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
    lineHeight: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 24,
    borderRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
