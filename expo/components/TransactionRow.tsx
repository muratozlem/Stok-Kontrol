import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Transaction, Product, Warehouse } from '@/types';

interface TransactionRowProps {
  transaction: Transaction;
  product?: Product;
  warehouse?: Warehouse;
}

export default React.memo(function TransactionRow({
  transaction,
  product,
  warehouse,
}: TransactionRowProps) {
  const isIn = transaction.type === 'IN';
  const dateStr = new Date(transaction.createdAt).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isIn ? Colors.successLight : Colors.dangerLight },
        ]}
      >
        {isIn ? (
          <ArrowDownLeft size={18} color={Colors.stockIn} strokeWidth={2.5} />
        ) : (
          <ArrowUpRight size={18} color={Colors.stockOut} strokeWidth={2.5} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.productName} numberOfLines={1}>
          {product?.name ?? 'Silinmiş Ürün'}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.dot} />
          <Text style={styles.meta} numberOfLines={1}>
            {warehouse?.name ?? 'Bilinmeyen Depo'}
          </Text>
          <Text style={styles.metaDivider}>·</Text>
          <Text style={styles.meta}>{dateStr}</Text>
        </View>
        {transaction.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {transaction.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text
          style={[
            styles.qty,
            { color: isIn ? Colors.stockIn : Colors.stockOut },
          ]}
        >
          {isIn ? '+' : '−'}
          {transaction.quantity}
        </Text>
        <View
          style={[
            styles.typePill,
            { backgroundColor: isIn ? Colors.successLight : Colors.dangerLight },
          ]}
        >
          <Text
            style={[
              styles.typeLabel,
              { color: isIn ? Colors.stockIn : Colors.stockOut },
            ]}
          >
            {isIn ? 'Giriş' : 'Çıkış'}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaDivider: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  note: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
    fontStyle: 'italic' as const,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  qty: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
});
