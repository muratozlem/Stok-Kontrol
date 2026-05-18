import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Minus,
  Plus,
  Package,
  ScanBarcode,
  Warehouse as WarehouseIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import Colors from '@/constants/colors';
import { TransactionType } from '@/types';

export default function StockTransactionPage() {
  const params = useLocalSearchParams<{
    type?: string;
    productId?: string;
    warehouseId?: string;
  }>();
  const { products, warehouses, addStockTransaction, getStockForProductInWarehouse } =
    useData();

  const [txType, setTxType] = useState<TransactionType>(
    (params.type as TransactionType) || 'IN'
  );
  const [selectedProduct, setSelectedProduct] = useState<string>(
    params.productId ?? ''
  );
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(
    params.warehouseId ?? ''
  );
  const [quantity, setQuantity] = useState<string>('1');
  const [note, setNote] = useState<string>('');

  const currentStock = useMemo(
    () =>
      selectedProduct && selectedWarehouse
        ? getStockForProductInWarehouse(selectedProduct, selectedWarehouse)
        : 0,
    [selectedProduct, selectedWarehouse, getStockForProductInWarehouse]
  );

  const isIn = txType === 'IN';
  const themeColor = isIn ? Colors.stockIn : Colors.stockOut;

  const adjustQty = useCallback(
    (delta: number) => {
      const c = parseInt(quantity, 10) || 0;
      const newVal = Math.max(1, c + delta);
      setQuantity(String(newVal));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [quantity]
  );

  const executeTransaction = useCallback((qty: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addStockTransaction(
      selectedProduct,
      selectedWarehouse,
      qty,
      txType,
      note.trim()
    );
    router.back();
  }, [selectedProduct, selectedWarehouse, txType, note, addStockTransaction]);

  const handleSubmit = useCallback(() => {
    if (!selectedProduct) {
      Alert.alert('Hata', 'Lütfen bir ürün seçin.');
      return;
    }
    if (!selectedWarehouse) {
      Alert.alert('Hata', 'Lütfen bir depo seçin.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Hata', 'Geçerli bir miktar girin.');
      return;
    }
    if (txType === 'OUT' && qty > currentStock) {
      Alert.alert('Hata', `Mevcut stok (${currentStock}) yetersiz.`);
      return;
    }

    if (txType === 'OUT') {
      const productName = products.find(p => p.id === selectedProduct)?.name ?? 'Seçili ürün';
      const warehouseName = warehouses.find(w => w.id === selectedWarehouse)?.name ?? 'Seçili depo';
      Alert.alert(
        'Stok Çıkışı Onayı',
        `"${productName}" ürününden ${qty} adet "${warehouseName}" deposundan çıkış yapılacak.\n\nMevcut stok: ${currentStock}\nİşlem sonrası: ${currentStock - qty}\n\nEmin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Onayla',
            style: 'destructive',
            onPress: () => executeTransaction(qty),
          },
        ]
      );
    } else {
      executeTransaction(qty);
    }
  }, [
    selectedProduct,
    selectedWarehouse,
    quantity,
    txType,
    note,
    currentStock,
    products,
    warehouses,
    executeTransaction,
  ]);

  const openBarcodeScanner = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const qp = new URLSearchParams();
    qp.set('mode', 'stockTransaction');
    qp.set('txType', txType);
    if (selectedWarehouse) qp.set('warehouseId', selectedWarehouse);
    router.push(`/barcode-scanner?${qp.toString()}`);
  }, [txType, selectedWarehouse]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, isIn && styles.typeBtnActive]}
            onPress={() => setTxType('IN')}
            activeOpacity={0.85}
            testID="type-in-btn"
          >
            {isIn ? (
              <LinearGradient
                colors={['#24B377', Colors.stockIn]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.typeBtnGradient}
              >
                <ArrowDownLeft size={20} color={Colors.white} strokeWidth={2.5} />
                <Text style={styles.typeBtnTextActive}>Stok Girişi</Text>
              </LinearGradient>
            ) : (
              <View style={styles.typeBtnInner}>
                <ArrowDownLeft size={20} color={Colors.stockIn} strokeWidth={2.4} />
                <Text style={styles.typeBtnText}>Stok Girişi</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, !isIn && styles.typeBtnActive]}
            onPress={() => setTxType('OUT')}
            activeOpacity={0.85}
            testID="type-out-btn"
          >
            {!isIn ? (
              <LinearGradient
                colors={['#EC6357', Colors.stockOut]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.typeBtnGradient}
              >
                <ArrowUpRight size={20} color={Colors.white} strokeWidth={2.5} />
                <Text style={styles.typeBtnTextActive}>Stok Çıkışı</Text>
              </LinearGradient>
            ) : (
              <View style={styles.typeBtnInner}>
                <ArrowUpRight size={20} color={Colors.stockOut} strokeWidth={2.4} />
                <Text style={styles.typeBtnText}>Stok Çıkışı</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepDot}>
              <Text style={styles.stepDotText}>1</Text>
            </View>
            <Text style={styles.label}>Ürün Seçin</Text>
          </View>
          <TouchableOpacity
            style={styles.scanBarBtn}
            onPress={openBarcodeScanner}
            activeOpacity={0.85}
            testID="scan-barcode-tx"
          >
            <ScanBarcode size={15} color={Colors.white} strokeWidth={2.4} />
            <Text style={styles.scanBarBtnText}>Barkod</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionList}>
          {products.length === 0 ? (
            <View style={styles.emptyCard}>
              <Package size={24} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Henüz ürün eklenmemiş</Text>
            </View>
          ) : (
            products.map((p) => {
              const active = selectedProduct === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.productOption,
                    active && styles.productOptionActive,
                  ]}
                  onPress={() => setSelectedProduct(p.id)}
                  activeOpacity={0.8}
                >
                  {p.imageUrl ? (
                    <Image
                      source={{ uri: p.imageUrl }}
                      style={styles.productOptionImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[
                      styles.productOptionPlaceholder,
                      active && styles.productOptionPlaceholderActive,
                    ]}>
                      <Package size={14} color={active ? Colors.white : Colors.textMuted} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.optionChipText,
                      active && styles.optionChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  {active && <Check size={14} color={Colors.white} strokeWidth={3} />}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepDot}>
              <Text style={styles.stepDotText}>2</Text>
            </View>
            <Text style={styles.label}>Depo Seçin</Text>
          </View>
        </View>
        <View style={styles.optionList}>
          {warehouses.length === 0 ? (
            <View style={styles.emptyCard}>
              <WarehouseIcon size={24} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Henüz depo eklenmemiş</Text>
            </View>
          ) : (
            warehouses.map((w) => {
              const active = selectedWarehouse === w.id;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.optionChip,
                    active && styles.optionChipActive,
                  ]}
                  onPress={() => setSelectedWarehouse(w.id)}
                  activeOpacity={0.8}
                >
                  <WarehouseIcon size={14} color={active ? Colors.white : Colors.textSecondary} strokeWidth={2.3} />
                  <Text
                    style={[
                      styles.optionChipText,
                      active && styles.optionChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {w.name}
                  </Text>
                  {active && <Check size={14} color={Colors.white} strokeWidth={3} />}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {selectedProduct && selectedWarehouse ? (
          <View style={styles.currentStockBanner}>
            <View style={styles.currentStockIcon}>
              <Package size={16} color={Colors.primary} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentStockLabel}>Mevcut Stok</Text>
              <Text style={styles.currentStockHint}>
                Bu depodaki miktar
              </Text>
            </View>
            <Text style={styles.currentStockValue}>{currentStock}</Text>
          </View>
        ) : null}

        <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepDot}>
              <Text style={styles.stepDotText}>3</Text>
            </View>
            <Text style={styles.label}>Miktar</Text>
          </View>
        </View>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => adjustQty(-1)}
            activeOpacity={0.7}
            testID="qty-minus"
          >
            <Minus size={22} color={Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.qtyInputWrap}>
            <TextInput
              style={styles.qtyInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              textAlign="center"
              testID="quantity-input"
            />
          </View>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => adjustQty(1)}
            activeOpacity={0.7}
            testID="qty-plus"
          >
            <Plus size={22} color={Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
          <Text style={styles.labelPlain}>Not (opsiyonel)</Text>
        </View>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="İşlem notu ekleyin..."
          placeholderTextColor={Colors.textMuted}
          testID="note-input"
        />

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.9}
          testID="submit-transaction-btn"
        >
          <LinearGradient
            colors={isIn ? ['#24B377', Colors.stockIn] : ['#EC6357', Colors.stockOut]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitBtnGradient}
          >
            {isIn ? (
              <ArrowDownLeft size={22} color={Colors.white} strokeWidth={2.6} />
            ) : (
              <ArrowUpRight size={22} color={Colors.white} strokeWidth={2.6} />
            )}
            <Text style={styles.submitBtnText}>
              {isIn ? 'Stok Girişi Yap' : 'Stok Çıkışı Yap'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
    padding: 6,
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  typeBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  typeBtnActive: {},
  typeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
  },
  typeBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  typeBtnTextActive: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderSpaced: {
    marginTop: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  label: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  labelPlain: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  scanBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 5,
  },
  scanBarBtnText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  optionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  productOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  productOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  productOptionImage: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  productOptionPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productOptionPlaceholderActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    maxWidth: 140,
  },
  optionChipTextActive: {
    color: Colors.white,
  },
  emptyCard: {
    width: '100%' as const,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed' as const,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  currentStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primaryVeryLight,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  currentStockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentStockLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  currentStockHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  currentStockValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 54,
    height: 58,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInputWrap: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  qtyInput: {
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  submitBtn: {
    marginTop: 26,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 40,
  },
});
