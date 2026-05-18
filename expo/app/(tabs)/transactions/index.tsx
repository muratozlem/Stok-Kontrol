import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight, LayoutGrid } from 'lucide-react-native';
import { useData } from '@/providers/DataProvider';
import Colors from '@/constants/colors';
import TransactionRow from '@/components/TransactionRow';
import EmptyState from '@/components/EmptyState';
import { Transaction } from '@/types';

export default function TransactionsListPage() {
  const { transactions, products, warehouses } = useData();
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('ALL');

  const filtered = useMemo(() => {
    let r = transactions;
    if (filterType !== 'ALL') r = r.filter((t) => t.type === filterType);
    if (filterWarehouse !== 'ALL')
      r = r.filter((t) => t.warehouseId === filterWarehouse);
    return r;
  }, [transactions, filterType, filterWarehouse]);

  const totals = useMemo(() => {
    const ins = filtered.filter((t) => t.type === 'IN').reduce((s, t) => s + t.quantity, 0);
    const outs = filtered.filter((t) => t.type === 'OUT').reduce((s, t) => s + t.quantity, 0);
    return { ins, outs };
  }, [filtered]);

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const getWarehouse = useCallback(
    (id: string) => warehouses.find((w) => w.id === id),
    [warehouses]
  );

  const renderTransaction = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        transaction={item}
        product={getProduct(item.productId)}
        warehouse={getWarehouse(item.warehouseId)}
      />
    ),
    [getProduct, getWarehouse]
  );

  const FILTER_CONFIG: { key: 'ALL' | 'IN' | 'OUT'; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'ALL', label: 'Tümü', icon: <LayoutGrid size={14} color={filterType === 'ALL' ? Colors.white : Colors.textSecondary} strokeWidth={2.4} />, color: Colors.primary },
    { key: 'IN', label: 'Giriş', icon: <ArrowDownLeft size={14} color={filterType === 'IN' ? Colors.white : Colors.stockIn} strokeWidth={2.4} />, color: Colors.stockIn },
    { key: 'OUT', label: 'Çıkış', icon: <ArrowUpRight size={14} color={filterType === 'OUT' ? Colors.white : Colors.stockOut} strokeWidth={2.4} />, color: Colors.stockOut },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>İşlem Geçmişi</Text>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryPill, { backgroundColor: Colors.successLight }]}>
            <ArrowDownLeft size={13} color={Colors.stockIn} strokeWidth={2.5} />
            <Text style={[styles.summaryText, { color: Colors.stockIn }]}>+{totals.ins}</Text>
          </View>
          <View style={[styles.summaryPill, { backgroundColor: Colors.dangerLight }]}>
            <ArrowUpRight size={13} color={Colors.stockOut} strokeWidth={2.5} />
            <Text style={[styles.summaryText, { color: Colors.stockOut }]}>−{totals.outs}</Text>
          </View>
          <Text style={styles.summaryCount}>{filtered.length} işlem</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {FILTER_CONFIG.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                filterType === f.key && { backgroundColor: f.color, borderColor: f.color },
              ]}
              onPress={() => setFilterType(f.key)}
              activeOpacity={0.8}
            >
              {f.icon}
              <Text
                style={[
                  styles.filterChipText,
                  filterType === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {warehouses.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.warehouseFilterRow}
          >
            <TouchableOpacity
              style={[
                styles.filterChipSmall,
                filterWarehouse === 'ALL' && styles.filterChipSmallActive,
              ]}
              onPress={() => setFilterWarehouse('ALL')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipSmallText,
                  filterWarehouse === 'ALL' &&
                    styles.filterChipSmallTextActive,
                ]}
              >
                Tüm Depolar
              </Text>
            </TouchableOpacity>
            {warehouses.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[
                  styles.filterChipSmall,
                  filterWarehouse === w.id && styles.filterChipSmallActive,
                ]}
                onPress={() => setFilterWarehouse(w.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipSmallText,
                    filterWarehouse === w.id &&
                      styles.filterChipSmallTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight size={32} color={Colors.primary} />}
          title="İşlem bulunamadı"
          subtitle={
            transactions.length === 0
              ? 'Henüz stok işlemi yapılmamış'
              : 'Filtre kriterlerine uygun işlem yok'
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
  },
  summaryCount: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginLeft: 'auto' as const,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  warehouseFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  filterChipSmall: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipSmallActive: {
    backgroundColor: Colors.primaryVeryLight,
    borderColor: Colors.primary,
  },
  filterChipSmallText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterChipSmallTextActive: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  separator: {
    height: 8,
  },
});
