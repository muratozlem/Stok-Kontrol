import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  AlertTriangle,
  Package,
  ArrowDownLeft,
  CheckCircle,
  Warehouse as WarehouseIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';
import EmptyState from '@/components/EmptyState';
import { LowStockWarehouseItem } from '@/types';

export default function CriticalStockPage() {
  const { getLowStockWarehouseItems } = useData();
  const { isStaff } = useAuth();

  const lowStockItems = useMemo(
    () => getLowStockWarehouseItems(),
    [getLowStockWarehouseItems]
  );

  const handleProduct = useCallback((productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product-detail?id=${productId}`);
  }, []);

  const handleStockIn = useCallback((productId: string, warehouseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/stock-transaction?type=IN&productId=${productId}&warehouseId=${warehouseId}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: LowStockWarehouseItem }) => {
      const { product, warehouse, stock } = item;
      const deficit = Math.max(0, product.criticalStockLevel - stock);
      const percent = product.criticalStockLevel > 0
        ? Math.min(100, Math.round((stock / product.criticalStockLevel) * 100))
        : 0;

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleProduct(product.id)}
          activeOpacity={0.85}
          testID={`critical-${product.id}-${warehouse.id}`}
        >
          <View style={styles.cardTop}>
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.productImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.iconWrap}>
                <Package size={20} color={Colors.danger} strokeWidth={2.3} />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {product.name}
              </Text>
              <View style={styles.warehouseBadge}>
                <WarehouseIcon size={11} color={Colors.primary} strokeWidth={2.3} />
                <Text style={styles.warehouseName} numberOfLines={1}>
                  {warehouse.name}
                </Text>
              </View>
            </View>
            {!isStaff && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleStockIn(product.id, warehouse.id)}
                activeOpacity={0.8}
                testID={`critical-add-${product.id}-${warehouse.id}`}
              >
                <ArrowDownLeft size={16} color={Colors.white} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${percent}%` as const },
              ]}
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Mevcut</Text>
              <Text style={[styles.footerValue, { color: Colors.danger }]}>
                {stock} {product.unit}
              </Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Minimum</Text>
              <Text style={styles.footerValue}>
                {product.criticalStockLevel} {product.unit}
              </Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Eksik</Text>
              <Text style={[styles.footerValue, { color: Colors.danger }]}>
                −{deficit}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleProduct, handleStockIn, isStaff]
  );

  if (isStaff) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <AlertTriangle size={48} color={Colors.textSecondary} strokeWidth={1.5} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16, textAlign: 'center' }}>
          Erişim Yok
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
          Kritik stok ekranına erişim yetkiniz bulunmuyor.
        </Text>
      </View>
    );
  }

  if (lowStockItems.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle size={36} color={Colors.success} />}
        title="Tüm stoklar yeterli!"
        subtitle="Hiçbir depoda kritik stok seviyesinin altında ürün bulunmuyor."
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryBanner}>
        <View style={styles.summaryIconWrap}>
          <AlertTriangle size={22} color={Colors.danger} strokeWidth={2.4} />
        </View>
        <View style={styles.summaryTextWrap}>
          <Text style={styles.summaryTitle}>
            {lowStockItems.length} depo kritik seviyede
          </Text>
          <Text style={styles.summarySubtitle}>
            Minimum stok seviyesinin altındaki depo–ürün kayıtları
          </Text>
        </View>
      </View>

      <FlatList
        data={lowStockItems}
        keyExtractor={(item) => `${item.product.id}-${item.warehouse.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.danger,
    letterSpacing: -0.2,
  },
  summarySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImage: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  warehouseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryVeryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  warehouseName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.stockIn,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.stockIn,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.dangerLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 14,
  },
  progressFill: {
    height: '100%' as const,
    backgroundColor: Colors.danger,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
  },
  footerLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  footerValue: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.text,
    marginTop: 3,
    letterSpacing: -0.2,
  },
});
