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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import Colors from '@/constants/colors';
import EmptyState from '@/components/EmptyState';
import { Product } from '@/types';

export default function CriticalStockPage() {
  const { getLowStockProducts, getStockForProduct } = useData();
  const lowStockProducts = useMemo(
    () => getLowStockProducts(),
    [getLowStockProducts]
  );

  const handleProduct = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product-detail?id=${id}`);
  }, []);

  const handleStockIn = useCallback((productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/stock-transaction?type=IN&productId=${productId}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => {
      const stock = getStockForProduct(item.id);
      const deficit = Math.max(0, item.criticalStockLevel - stock);
      const percent = item.criticalStockLevel > 0
        ? Math.min(100, Math.round((stock / item.criticalStockLevel) * 100))
        : 0;

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleProduct(item.id)}
          activeOpacity={0.85}
          testID={`critical-${item.id}`}
        >
          <View style={styles.cardTop}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
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
                {item.name}
              </Text>
              <Text style={styles.barcode}>
                {item.barcode || 'Barkod yok'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => handleStockIn(item.id)}
              activeOpacity={0.8}
              testID={`critical-add-${item.id}`}
            >
              <ArrowDownLeft size={16} color={Colors.white} strokeWidth={2.5} />
            </TouchableOpacity>
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
                {stock} {item.unit}
              </Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Minimum</Text>
              <Text style={styles.footerValue}>
                {item.criticalStockLevel} {item.unit}
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
    [getStockForProduct, handleProduct, handleStockIn]
  );

  if (lowStockProducts.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle size={36} color={Colors.success} />}
        title="Tüm stoklar yeterli!"
        subtitle="Kritik stok seviyesinin altında ürün bulunmuyor. Stok durumunuz sağlıklı görünüyor."
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
            {lowStockProducts.length} ürün kritik seviyede
          </Text>
          <Text style={styles.summarySubtitle}>
            Minimum stok seviyesinin altındaki ürünler
          </Text>
        </View>
      </View>

      <FlatList
        data={lowStockProducts}
        keyExtractor={(item) => item.id}
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
  },
  productName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  barcode: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
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
