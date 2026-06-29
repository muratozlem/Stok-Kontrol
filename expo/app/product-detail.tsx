import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Package,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  BarChart3,
  Warehouse as WarehouseIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';
import TransactionRow from '@/components/TransactionRow';

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isStaff } = useAuth();
  const {
    products,
    warehouses,
    inventory,
    deleteProduct,
    getStockForProduct,
    getStockForProductInWarehouse,
    getTransactionsForProduct,
  } = useData();

  const product = useMemo(
    () => products.find((p) => p.id === id),
    [products, id]
  );

  const totalStock = useMemo(
    () => (product ? getStockForProduct(product.id) : 0),
    [product, getStockForProduct]
  );

  const productWarehouses = useMemo(() => {
    if (!product) return [];
    const warehouseIdsWithEntry = new Set(
      inventory.filter(inv => inv.productId === product.id).map(inv => inv.warehouseId)
    );
    return warehouses.filter(w => warehouseIdsWithEntry.has(w.id));
  }, [product, inventory, warehouses]);

  const isCritical = useMemo(() => {
    if (!product || product.criticalStockLevel <= 0) return false;
    return productWarehouses.some(
      w => getStockForProductInWarehouse(product.id, w.id) <= product.criticalStockLevel
    );
  }, [product, productWarehouses, getStockForProductInWarehouse]);

  const productTransactions = useMemo(
    () => (product ? getTransactionsForProduct(product.id).slice(0, 20) : []),
    [product, getTransactionsForProduct]
  );

  const handleDelete = useCallback(() => {
    if (!product) return;
    Alert.alert(
      'Ürünü Sil',
      `"${product.name}" ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteProduct(product.id);
            router.back();
          },
        },
      ]
    );
  }, [product, deleteProduct]);

  const handleStockIn = useCallback(() => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/stock-transaction?type=IN&productId=${product.id}`);
  }, [product]);

  const handleStockOut = useCallback(() => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/stock-transaction?type=OUT&productId=${product.id}`);
  }, [product]);

  if (!product) {
    return (
      <View style={styles.center}>
        <Package size={48} color={Colors.textMuted} />
        <Text style={styles.notFound}>Ürün bulunamadı</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={
          isCritical
            ? ['#FDE6E2', Colors.background]
            : [Colors.primaryVeryLight, Colors.background]
        }
        style={styles.heroBg}
      />

      <View style={styles.header}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Package size={44} color={Colors.primary} strokeWidth={2} />
          </View>
        )}
        <Text style={styles.productName}>{product.name}</Text>
        {product.barcode ? (
          <View style={styles.barcodeWrap}>
            <BarChart3 size={13} color={Colors.textSecondary} />
            <Text style={styles.barcode}>{product.barcode}</Text>
          </View>
        ) : null}
        {product.description ? (
          <Text style={styles.description}>{product.description}</Text>
        ) : null}
      </View>

      <View style={styles.stockCard}>
        <View style={styles.stockRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stockLabel}>Toplam Stok</Text>
            <View style={styles.stockValueRow}>
              <Text
                style={[
                  styles.stockValue,
                  isCritical && styles.stockValueCritical,
                ]}
              >
                {totalStock}
              </Text>
              <Text style={styles.stockUnit}>{product.unit}</Text>
            </View>
          </View>
          <View style={styles.stockDivider} />
          <View style={styles.stockRight}>
            <Text style={styles.stockLabel}>Kritik Seviye</Text>
            <View style={styles.stockValueRow}>
              <Text style={styles.criticalValue}>
                {product.criticalStockLevel}
              </Text>
              <Text style={styles.stockUnit}>{product.unit}</Text>
            </View>
          </View>
        </View>
        {isCritical && (
          <View style={styles.criticalBanner}>
            <AlertTriangle size={15} color={Colors.danger} strokeWidth={2.4} />
            <Text style={styles.criticalText}>
              Stok kritik seviyenin altında!
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        {!isStaff && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.stockIn }]}
            onPress={handleStockIn}
            activeOpacity={0.85}
            testID="detail-stock-in"
          >
            <ArrowDownLeft size={18} color={Colors.white} strokeWidth={2.5} />
            <Text style={styles.actionBtnText}>Giriş</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.stockOut }]}
          onPress={handleStockOut}
          activeOpacity={0.85}
          testID="detail-stock-out"
        >
          <ArrowUpRight size={18} color={Colors.white} strokeWidth={2.5} />
          <Text style={styles.actionBtnText}>Çıkış</Text>
        </TouchableOpacity>
        {!isStaff && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.85}
            testID="detail-delete"
          >
            <Trash2 size={18} color={Colors.danger} strokeWidth={2.3} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Depo Bazlı Stok</Text>
      <View style={styles.warehouseStocks}>
        {productWarehouses.length === 0 && (
          <Text style={styles.emptyText}>Henüz stok kaydı yok</Text>
        )}
        {productWarehouses.map((w, i) => {
          const qty = getStockForProductInWarehouse(product.id, w.id);
          const whCritical = product.criticalStockLevel > 0 && qty <= product.criticalStockLevel;
          return (
            <View
              key={w.id}
              style={[
                styles.whRow,
                i === productWarehouses.length - 1 && styles.whRowLast,
                whCritical && styles.whRowCritical,
              ]}
            >
              <View style={[styles.whIconWrap, whCritical && styles.whIconWrapCritical]}>
                {whCritical
                  ? <AlertTriangle size={16} color={Colors.danger} strokeWidth={2.3} />
                  : <WarehouseIcon size={16} color={Colors.primary} strokeWidth={2.3} />
                }
              </View>
              <Text style={[styles.whName, whCritical && styles.whNameCritical]}>{w.name}</Text>
              <Text style={[styles.whQty, whCritical && styles.whQtyCritical]}>
                {qty} {product.unit}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Son İşlemler</Text>
      {productTransactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Henüz işlem yapılmamış</Text>
        </View>
      ) : (
        <View style={styles.txCard}>
          {productTransactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              product={product}
              warehouse={warehouses.find((w) => w.id === tx.warehouseId)}
            />
          ))}
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroBg: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  content: {
    padding: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 12,
  },
  notFound: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: Colors.white,
    fontWeight: '600' as const,
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
    paddingTop: 4,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  barcodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  barcode: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  stockCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  stockValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  stockValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: -0.8,
  },
  stockValueCritical: {
    color: Colors.danger,
  },
  stockUnit: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  stockRight: {
    flex: 1,
    alignItems: 'flex-end' as const,
  },
  stockDivider: {
    width: 1,
    height: 44,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 16,
  },
  criticalValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.textSecondary,
    letterSpacing: -0.4,
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 11,
    marginTop: 14,
  },
  criticalText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.danger,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 7,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  deleteBtn: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
  },
  actionBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  warehouseStocks: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  whRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  whRowLast: {
    borderBottomWidth: 0,
  },
  whRowCritical: {
    backgroundColor: Colors.dangerLight,
  },
  whIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whIconWrapCritical: {
    backgroundColor: '#FFD6D0',
  },
  whName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  whNameCritical: {
    color: Colors.danger,
  },
  whQty: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  whQtyCritical: {
    color: Colors.danger,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 22,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  txCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bottomSpacer: {
    height: 40,
  },
});
