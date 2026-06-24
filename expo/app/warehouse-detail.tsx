import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Warehouse as WarehouseIcon,
  Trash2,
  MapPin,
  Package,
  ArrowDownLeft,
  Boxes,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';

export default function WarehouseDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { warehouses, products, inventory, deleteWarehouse } = useData();
  const { isAdmin, isChef, isStaff } = useAuth();
  const canManageWarehouse = isAdmin || isChef;
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const warehouse = useMemo(
    () => warehouses.find((w) => w.id === id),
    [warehouses, id]
  );

  const warehouseInventory = useMemo(() => {
    if (!warehouse) return [];
    return inventory
      .filter((i) => i.warehouseId === warehouse.id && i.quantity > 0)
      .map((i) => ({
        ...i,
        product: products.find((p) => p.id === i.productId),
      }));
  }, [warehouse, inventory, products]);

  const totalStock = useMemo(
    () => warehouseInventory.reduce((s, i) => s + i.quantity, 0),
    [warehouseInventory]
  );

  const handleDeleteRequest = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteConfirming(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!warehouse) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteWarehouse(warehouse.id);
    router.back();
  }, [warehouse, deleteWarehouse]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirming(false);
  }, []);

  const handleAddStock = useCallback(() => {
    if (!warehouse) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/stock-transaction?type=IN&warehouseId=${warehouse.id}`);
  }, [warehouse]);

  if (!warehouse) {
    return (
      <View style={styles.center}>
        <WarehouseIcon size={48} color={Colors.textMuted} />
        <Text style={styles.notFound}>Depo bulunamadı</Text>
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
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={styles.headerDeco1} />
        <View style={styles.headerDeco2} />
        <View style={styles.iconCircle}>
          <WarehouseIcon size={32} color={Colors.white} strokeWidth={2.2} />
        </View>
        <Text style={styles.warehouseName}>{warehouse.name}</Text>
        {warehouse.location ? (
          <View style={styles.locationRow}>
            <MapPin size={13} color="rgba(255,255,255,0.9)" />
            <Text style={styles.locationText}>{warehouse.location}</Text>
          </View>
        ) : null}
        {warehouse.description ? (
          <Text style={styles.description}>{warehouse.description}</Text>
        ) : null}
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <Package size={16} color={Colors.info} strokeWidth={2.4} />
          </View>
          <Text style={styles.statValue}>{warehouseInventory.length}</Text>
          <Text style={styles.statLabel}>Ürün Çeşidi</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconWrapOrange}>
            <Boxes size={16} color={Colors.primary} strokeWidth={2.4} />
          </View>
          <Text style={styles.statValue}>{totalStock}</Text>
          <Text style={styles.statLabel}>Toplam Stok</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {!isStaff && (
          <TouchableOpacity
            style={styles.addStockBtn}
            onPress={handleAddStock}
            activeOpacity={0.85}
            testID="warehouse-stock-in"
          >
            <ArrowDownLeft size={18} color={Colors.white} strokeWidth={2.5} />
            <Text style={styles.addStockText}>Stok Girişi Yap</Text>
          </TouchableOpacity>
        )}
        {canManageWarehouse && !deleteConfirming && (
          <TouchableOpacity
            style={[styles.deleteBtn, !isStaff && styles.deleteBtnWithStock]}
            onPress={handleDeleteRequest}
            activeOpacity={0.85}
            testID="warehouse-delete"
          >
            <Trash2 size={18} color={Colors.danger} strokeWidth={2.3} />
          </TouchableOpacity>
        )}
      </View>

      {deleteConfirming && (
        <View style={styles.confirmCard}>
          <View style={styles.confirmIconWrap}>
            <AlertTriangle size={22} color={Colors.danger} strokeWidth={2.3} />
          </View>
          <Text style={styles.confirmTitle}>Depoyu Sil?</Text>
          <Text style={styles.confirmText}>
            "{warehouse?.name}" deposunu ve içindeki tüm stok kayıtlarını silmek istediğinize emin misiniz?
          </Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={handleDeleteCancel} activeOpacity={0.8}>
              <Text style={styles.confirmCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmDeleteBtn} onPress={handleDeleteConfirm} activeOpacity={0.85}>
              <Trash2 size={16} color={Colors.white} strokeWidth={2.3} />
              <Text style={styles.confirmDeleteText}>Evet, Sil</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Depodaki Ürünler</Text>
        <Text style={styles.sectionCount}>{warehouseInventory.length}</Text>
      </View>
      {warehouseInventory.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Package size={28} color={Colors.primary} />
          </View>
          <Text style={styles.emptyText}>Bu depoda henüz ürün yok</Text>
          <Text style={styles.emptyHint}>
            Stok girişi yaparak ürün ekleyebilirsiniz
          </Text>
        </View>
      ) : (
        <View style={styles.productList}>
          {warehouseInventory.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.productRow,
                i === warehouseInventory.length - 1 && styles.productRowLast,
              ]}
              onPress={() =>
                item.product &&
                router.push(`/product-detail?id=${item.product.id}`)
              }
              activeOpacity={0.7}
            >
              <View style={styles.productIcon}>
                <Package size={18} color={Colors.primary} strokeWidth={2.3} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.product?.name ?? 'Bilinmeyen'}
                </Text>
                <Text style={styles.productUnit}>
                  {item.product?.unit ?? ''}
                </Text>
              </View>
              <View style={styles.qtyPill}>
                <Text style={styles.productQty}>{item.quantity}</Text>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
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
  headerCard: {
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  headerDeco1: {
    position: 'absolute' as const,
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerDeco2: {
    position: 'absolute' as const,
    bottom: -50,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  warehouseName: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500' as const,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconWrapOrange: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  addStockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.stockIn,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.stockIn,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  addStockText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  deleteBtn: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
  },
  deleteBtnWithStock: {
    marginLeft: 10,
  },
  confirmCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.dangerLight,
    gap: 6,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  confirmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.danger,
    letterSpacing: -0.3,
  },
  confirmText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  confirmDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    gap: 6,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    backgroundColor: Colors.primaryVeryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700' as const,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  productList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  productRowLast: {
    borderBottomWidth: 0,
  },
  productIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  productUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  qtyPill: {
    backgroundColor: Colors.primaryVeryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  productQty: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  bottomSpacer: {
    height: 40,
  },
});
