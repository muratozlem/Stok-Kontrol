import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  ScanBarcode,
  X,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';
import EmptyState from '@/components/EmptyState';
import { Product } from '@/types';

export default function ProductsListPage() {
  const { products, inventory, warehouses, getLowStockProducts } = useData();
  const { isStaff } = useAuth();
  const [search, setSearch] = useState<string>('');

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
    );
  }, [products, search]);

  const lowStockIds = useMemo(
    () => new Set(getLowStockProducts().map((p) => p.id)),
    [getLowStockProducts]
  );

  const handleAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-product');
  }, []);

  const handleProduct = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product-detail?id=${id}`);
  }, []);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const isCritical = lowStockIds.has(item.id);
      const whStocks = warehouses
        .map(w => {
          const qty = inventory.find(i => i.productId === item.id && i.warehouseId === w.id)?.quantity ?? 0;
          const isCrit = item.criticalStockLevel > 0 && qty <= item.criticalStockLevel;
          return { name: w.name, qty, isCrit };
        })
        .filter(w => w.qty > 0);

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleProduct(item.id)}
          activeOpacity={0.8}
          testID={`product-${item.id}`}
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Package size={22} color={Colors.primary} strokeWidth={2.2} />
            </View>
          )}
          <View style={styles.cardContent}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.barcode} numberOfLines={1}>
              {item.barcode || 'Barkod yok'}
            </Text>
            <View style={styles.cardBottomRow}>
              <View style={styles.whChipsRow}>
                {whStocks.length === 0 ? (
                  <View style={[styles.stockPill, styles.stockPillEmpty]}>
                    <View style={[styles.stockDot, { backgroundColor: Colors.textMuted }]} />
                    <Text style={[styles.stockText, { color: Colors.textSecondary }]}>Stok yok</Text>
                  </View>
                ) : (
                  whStocks.slice(0, 2).map((ws, idx) => (
                    <View key={idx} style={[styles.stockPill, ws.isCrit && styles.stockPillCritical]}>
                      <View style={[styles.stockDot, { backgroundColor: ws.isCrit ? Colors.danger : Colors.success }]} />
                      <Text
                        style={[styles.stockText, { color: ws.isCrit ? Colors.danger : Colors.text }]}
                        numberOfLines={1}
                      >
                        {ws.name}: {ws.qty} {item.unit}
                      </Text>
                    </View>
                  ))
                )}
                {whStocks.length > 2 && (
                  <View style={[styles.stockPill, styles.stockPillEmpty]}>
                    <Text style={[styles.stockText, { color: Colors.textMuted }]}>+{whStocks.length - 2}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.criticalLevel}>Min {item.criticalStockLevel}</Text>
            </View>
          </View>
          {isCritical && (
            <View style={styles.criticalBadge}>
              <AlertTriangle size={12} color={Colors.white} strokeWidth={2.6} />
            </View>
          )}
          <View style={styles.chevronWrap}>
            <ChevronRight size={16} color={Colors.textMuted} />
          </View>
        </TouchableOpacity>
      );
    },
    [inventory, warehouses, lowStockIds, handleProduct]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Ürünler</Text>
            <Text style={styles.headerSubtitle}>
              {products.length} ürün kayıtlı
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ürün adı veya barkod..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              testID="product-search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <X size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.scanFab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/barcode-scanner?mode=search');
            }}
            activeOpacity={0.8}
            testID="scan-search-btn"
          >
            <ScanBarcode size={20} color={Colors.white} strokeWidth={2.3} />
          </TouchableOpacity>
        </View>
      </View>

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package size={32} color={Colors.primary} />}
          title={search ? 'Sonuç bulunamadı' : 'Henüz ürün yok'}
          subtitle={
            search
              ? 'Farklı anahtar kelimeler deneyin'
              : 'İlk ürününüzü ekleyerek başlayın'
          }
          actionLabel={search || isStaff ? undefined : 'Ürün Ekle'}
          onAction={search || isStaff ? undefined : handleAdd}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {!isStaff && (
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAdd}
        activeOpacity={0.9}
        testID="add-product-btn"
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
    paddingBottom: 14,
    backgroundColor: Colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  scanFab: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 110,
  },
  separator: {
    height: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    position: 'relative' as const,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  criticalBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcode: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
    gap: 6,
  },
  whChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockPillCritical: {
    backgroundColor: Colors.dangerLight,
  },
  stockPillEmpty: {
    backgroundColor: Colors.borderLight,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  criticalLevel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  chevronWrap: {
    paddingLeft: 4,
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
