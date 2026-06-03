import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileText,
  Warehouse as WarehouseIcon,
  Package,
  Check,
  Download,
  CheckCircle2,
  Sheet,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useMutation } from '@tanstack/react-query';
import { useData } from '@/providers/DataProvider';
import Colors from '@/constants/colors';
import EmptyState from '@/components/EmptyState';

const ALL_ID = '__ALL__';

function esc(v: string | number | undefined | null): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function ReportsPage() {
  const { products, warehouses, inventory, getStockForProductInWarehouse, getStockForProduct } =
    useData();

  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([ALL_ID]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([ALL_ID]);

  const toggleWarehouse = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedWarehouses((prev) => {
      if (id === ALL_ID) return [ALL_ID];
      const without = prev.filter((x) => x !== ALL_ID);
      if (without.includes(id)) {
        const next = without.filter((x) => x !== id);
        return next.length === 0 ? [ALL_ID] : next;
      }
      return [...without, id];
    });
  }, []);

  const toggleProduct = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedProducts((prev) => {
      if (id === ALL_ID) return [ALL_ID];
      const without = prev.filter((x) => x !== ALL_ID);
      if (without.includes(id)) {
        const next = without.filter((x) => x !== id);
        return next.length === 0 ? [ALL_ID] : next;
      }
      return [...without, id];
    });
  }, []);

  const effectiveWarehouses = useMemo(() => {
    if (selectedWarehouses.includes(ALL_ID)) return warehouses;
    return warehouses.filter((w) => selectedWarehouses.includes(w.id));
  }, [warehouses, selectedWarehouses]);

  const effectiveProducts = useMemo(() => {
    if (selectedProducts.includes(ALL_ID)) return products;
    return products.filter((p) => selectedProducts.includes(p.id));
  }, [products, selectedProducts]);

  const isPrAllMemo = selectedProducts.includes(ALL_ID);
  const reportRows = useMemo(() => {
    const rows: {
      productId: string;
      productName: string;
      unit: string;
      barcode: string;
      critical: number;
      warehouseId: string;
      warehouseName: string;
      quantity: number;
      isCritical: boolean;
    }[] = [];
    for (const p of effectiveProducts) {
      for (const w of effectiveWarehouses) {
        const qty = getStockForProductInWarehouse(p.id, w.id);
        if (qty === 0 && isPrAllMemo) continue;
        rows.push({
          productId: p.id,
          productName: p.name,
          unit: p.unit || 'adet',
          barcode: p.barcode,
          critical: p.criticalStockLevel,
          warehouseId: w.id,
          warehouseName: w.name,
          quantity: qty,
          isCritical: getStockForProduct(p.id) <= p.criticalStockLevel,
        });
      }
    }
    rows.sort((a, b) =>
      a.warehouseName.localeCompare(b.warehouseName, 'tr') ||
      a.productName.localeCompare(b.productName, 'tr') === 0
        ? a.productName.localeCompare(b.productName, 'tr')
        : a.warehouseName.localeCompare(b.warehouseName, 'tr')
    );
    return rows;
  }, [effectiveProducts, effectiveWarehouses, getStockForProductInWarehouse, getStockForProduct, isPrAllMemo]);

  const totalQty = useMemo(
    () => reportRows.reduce((s, r) => s + r.quantity, 0),
    [reportRows]
  );
  const criticalCount = useMemo(
    () => reportRows.filter((r) => r.isCritical).length,
    [reportRows]
  );

  const buildHtml = useCallback((): string => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const whLabel = selectedWarehouses.includes(ALL_ID)
      ? 'Tüm Depolar'
      : effectiveWarehouses.map((w) => esc(w.name)).join(', ');
    const prLabel = selectedProducts.includes(ALL_ID)
      ? 'Tüm Ürünler'
      : effectiveProducts.map((p) => esc(p.name)).join(', ');

    const grouped: Record<string, typeof reportRows> = {};
    for (const r of reportRows) {
      if (!grouped[r.warehouseId]) grouped[r.warehouseId] = [];
      grouped[r.warehouseId]!.push(r);
    }

    const sections = Object.entries(grouped)
      .map(([wid, rows]) => {
        const wName = rows[0]?.warehouseName ?? '';
        const whTotal = rows.reduce((s, r) => s + r.quantity, 0);
        const distinctProducts = new Set(rows.map((r) => r.productId)).size;
        const tableRows = rows
          .map(
            (r, i) => `
          <tr class="${i % 2 === 0 ? 'even' : 'odd'} ${r.quantity === 0 ? 'zero' : ''}">
            <td class="idx">${i + 1}</td>
            <td class="name">
              <div class="pname">${esc(r.productName)}</div>
              ${r.barcode ? `<div class="bcode">${esc(r.barcode)}</div>` : ''}
            </td>
            <td class="center">${esc(r.critical)} ${esc(r.unit)}</td>
            <td class="right">
              <span class="qty ${r.isCritical ? 'critical' : ''} ${r.quantity === 0 ? 'empty' : ''}">${esc(r.quantity)}</span>
              <span class="unit">${esc(r.unit)}</span>
              ${r.quantity === 0 ? '<span class="badge zeroBadge">STOK YOK</span>' : r.isCritical ? '<span class="badge">KRİTİK</span>' : ''}
            </td>
          </tr>`
          )
          .join('');
        return `
        <section class="wh-section">
          <div class="wh-head">
            <div>
              <div class="wh-label">DEPO</div>
              <div class="wh-name">${esc(wName)}</div>
            </div>
            <div class="wh-stats">
              <div class="wh-stat"><span>${distinctProducts}</span> ürün çeşidi</div>
              <div class="wh-stat primary"><span>${whTotal}</span> toplam stok</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="idx">#</th>
                <th>Ürün</th>
                <th class="center">Kritik Seviye</th>
                <th class="right">Mevcut Stok</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </section>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>Stok Raporu</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 32px;
    color: #1A1D2E;
    background: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #F5A05A 0%, #C4610D 100%);
    color: #fff;
    padding: 28px 32px;
    border-radius: 18px;
    margin-bottom: 24px;
  }
  .brand { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; opacity: .85; }
  .title { font-size: 28px; font-weight: 800; margin-top: 6px; letter-spacing: -.5px; }
  .meta { margin-top: 8px; font-size: 13px; opacity: .9; }
  .filters {
    margin-bottom: 20px;
    background: #FFF3E8;
    border: 1px solid #FFE3CC;
    border-radius: 14px;
    padding: 14px 18px;
    font-size: 13px;
  }
  .filters .row { margin: 4px 0; }
  .filters b { color: #C4610D; }
  .summary {
    display: flex;
    gap: 12px;
    margin-bottom: 22px;
  }
  .stat {
    flex: 1;
    background: #fff;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 14px 16px;
  }
  .stat .lbl { font-size: 11px; color: #5A6178; text-transform: uppercase; letter-spacing: 1px; }
  .stat .val { font-size: 22px; font-weight: 800; margin-top: 4px; letter-spacing: -.5px; }
  .stat.primary .val { color: #F07D28; }
  .stat.info .val { color: #3ABEDB; }
  .stat.danger .val { color: #E04B3C; }
  .wh-section { margin-bottom: 22px; page-break-inside: avoid; }
  .wh-head {
    display: flex; justify-content: space-between; align-items: center;
    background: #1A1D2E; color: #fff; padding: 12px 18px;
    border-radius: 12px 12px 0 0;
  }
  .wh-label { font-size: 9px; letter-spacing: 1.4px; opacity: .65; font-weight: 700; }
  .wh-name { font-weight: 800; letter-spacing: -.3px; font-size: 16px; margin-top: 2px; }
  .wh-stats { display: flex; gap: 14px; text-align: right; }
  .wh-stat { font-size: 10px; letter-spacing: .5px; opacity: .7; text-transform: uppercase; }
  .wh-stat span { display: block; font-size: 17px; font-weight: 800; color: #fff; opacity: 1; letter-spacing: -.3px; }
  .wh-stat.primary span { color: #F5A05A; }
  table { width: 100%; border-collapse: collapse; background: #fff;
    border: 1px solid #E2E8F0; border-top: none;
    border-radius: 0 0 12px 12px; overflow: hidden; font-size: 12.5px; }
  thead th { background: #F6F8FB; color: #5A6178; font-weight: 700;
    padding: 10px 14px; text-align: left; font-size: 11px;
    text-transform: uppercase; letter-spacing: .6px;
    border-bottom: 1px solid #E2E8F0; }
  tbody td { padding: 11px 14px; border-bottom: 1px solid #EDF1F7; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tr.odd td { background: #FAFBFD; }
  tr.zero td { background: #F8F9FC; }
  th.idx, td.idx { width: 36px; text-align: center; color: #9099B2; font-size: 11px; font-weight: 700; }
  .center { text-align: center; font-size: 12px; color: #5A6178; }
  .right  { text-align: right; white-space: nowrap; }
  .qty { font-size: 16px; font-weight: 800; color: #1A1D2E; letter-spacing: -.3px; }
  .qty.critical { color: #E04B3C; }
  .qty.empty { color: #9099B2; }
  .unit { font-size: 11px; color: #5A6178; margin-left: 3px; font-weight: 600; }
  .badge {
    display: inline-block; margin-left: 6px; padding: 2px 7px;
    font-size: 9px; font-weight: 800; letter-spacing: .5px;
    background: #FDE6E2; color: #E04B3C; border-radius: 6px;
  }
  .badge.zeroBadge { background: #EFF2F7; color: #9099B2; }
  .pname { font-weight: 600; color: #1A1D2E; }
  .bcode { font-size: 11px; color: #9099B2; margin-top: 2px; font-family: monospace; }
  .empty { text-align:center; padding: 40px; color: #9099B2; font-style: italic; }
  .footer {
    margin-top: 30px; padding-top: 18px;
    border-top: 1px solid #E2E8F0;
    text-align: center; font-size: 11px; color: #9099B2;
    letter-spacing: .5px;
  }
  .footer b { color: #F07D28; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Stok Kontrol</div>
    <div class="title">Stok Durum Raporu</div>
    <div class="meta">${esc(dateStr)} · ${esc(timeStr)}</div>
  </div>
  <div class="filters">
    <div class="row"><b>Depolar:</b> ${whLabel}</div>
    <div class="row"><b>Ürünler:</b> ${prLabel}</div>
  </div>
  <div class="summary">
    <div class="stat primary"><div class="lbl">Ürün Satırı</div><div class="val">${reportRows.length}</div></div>
    <div class="stat info"><div class="lbl">Toplam Stok</div><div class="val">${totalQty}</div></div>
    <div class="stat danger"><div class="lbl">Kritik</div><div class="val">${criticalCount}</div></div>
  </div>
  ${sections || '<div class="empty">Seçilen filtrelere uygun stok bulunamadı.</div>'}
  <div class="footer">
    BUILT &amp; DESIGNED BY <b>Murat KARAGÖZ</b>
  </div>
</body>
</html>`;
  }, [
    reportRows,
    totalQty,
    criticalCount,
    selectedWarehouses,
    selectedProducts,
    effectiveWarehouses,
    effectiveProducts,
  ]);

  const buildCsv = useCallback((): string => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const whLabel = selectedWarehouses.includes(ALL_ID)
      ? 'Tüm Depolar'
      : effectiveWarehouses.map((w) => w.name).join(' | ');
    const prLabel = selectedProducts.includes(ALL_ID)
      ? 'Tüm Ürünler'
      : effectiveProducts.map((p) => p.name).join(' | ');

    const q = (v: string | number) => {
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const rows: string[] = [];
    rows.push(q('Stok Kontrol — Stok Durum Raporu'));
    rows.push(q(`Rapor Tarihi: ${dateStr}  Saat: ${timeStr}`));
    rows.push(q(`Depolar: ${whLabel}`));
    rows.push(q(`Ürünler: ${prLabel}`));
    rows.push(q(`Toplam Satır: ${reportRows.length}  Toplam Stok: ${totalQty}  Kritik: ${criticalCount}  Normal: ${reportRows.length - criticalCount}`));
    rows.push('');
    rows.push(['#', 'Ürün Adı', 'Barkod', 'Depo', 'Birim', 'Kritik Seviye', 'Mevcut Stok', 'Durum', 'Rapor Tarihi'].map(q).join(','));
    for (let i = 0; i < reportRows.length; i++) {
      const r = reportRows[i]!;
      rows.push([
        i + 1,
        r.productName,
        r.barcode || '',
        r.warehouseName,
        r.unit,
        r.critical,
        r.quantity,
        r.quantity === 0 ? 'STOK YOK' : r.isCritical ? 'KRİTİK' : 'Normal',
        `${dateStr} ${timeStr}`,
      ].map(q).join(','));
    }

    // UTF-8 BOM so Excel displays Turkish characters correctly
    return '\uFEFF' + rows.join('\r\n');
  }, [reportRows, totalQty, criticalCount, selectedWarehouses, selectedProducts, effectiveWarehouses, effectiveProducts]);

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      console.log('[Reports] Generating PDF...');
      const html = buildHtml();
      const fileName = `stok-raporu-${new Date()
        .toISOString()
        .slice(0, 16)
        .replace(/[:T]/g, '-')}.pdf`;

      if (Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const tab = window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        if (!tab) {
          Alert.alert('Açılamadı', 'Yeni sekme açılamadı. Lütfen tarayıcı popup engelleyicisini kapatın.');
        }
        return { fileName, shared: true };
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      console.log('[Reports] PDF generated at:', uri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Stok Raporunu Kaydet / Paylaş',
          UTI: 'com.adobe.pdf',
        });
        return { uri, fileName, shared: true };
      }
      return { uri, fileName, shared: false };
    },
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS !== 'web' && !res.shared) {
        Alert.alert('Rapor Hazır', `Dosya oluşturuldu:\n${res.uri ?? res.fileName}`);
      }
    },
    onError: (err) => {
      console.log('[Reports] PDF error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Hata', 'PDF oluşturulurken bir hata oluştu.');
    },
  });

  const generateExcelMutation = useMutation({
    mutationFn: async () => {
      console.log('[Reports] Generating CSV for Excel...');
      const csvContent = buildCsv();
      const fileName = `stok-raporu-${new Date()
        .toISOString()
        .slice(0, 16)
        .replace(/[:T]/g, '-')}.csv`;

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        return { fileName, shared: true };
      }

      // Native: write UTF-8 text then share
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log('[Reports] CSV written at:', fileUri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Stok Raporunu Kaydet / Paylaş',
          UTI: 'public.comma-separated-values-text',
        });
        return { fileName, shared: true };
      }
      return { fileName, shared: false };
    },
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === 'web') {
        Alert.alert('Rapor Hazır', 'CSV dosyası indirildi. Microsoft Excel veya Google Sheets ile açabilirsiniz.');
      } else if (!res.shared) {
        Alert.alert('Rapor Hazır', `Dosya oluşturuldu:\n${res.fileName}`);
      }
    },
    onError: (err) => {
      console.log('[Reports] CSV error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Hata', 'Excel dosyası oluşturulurken bir hata oluştu.');
    },
  });

  const isGenerating = generatePdfMutation.isPending || generateExcelMutation.isPending;

  const handlePdf = useCallback(() => {
    if (reportRows.length === 0) {
      Alert.alert('Veri Yok', 'Seçilen filtrelere uygun stok bulunamadı.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generatePdfMutation.mutate();
  }, [reportRows, generatePdfMutation]);

  const handleExcel = useCallback(() => {
    if (reportRows.length === 0) {
      Alert.alert('Veri Yok', 'Seçilen filtrelere uygun stok bulunamadı.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateExcelMutation.mutate();
  }, [reportRows, generateExcelMutation]);

  if (products.length === 0 && warehouses.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={<FileText size={32} color={Colors.primary} />}
          title="Rapor oluşturulamıyor"
          subtitle="Önce depo ve ürün eklemeniz gerekir"
        />
      </View>
    );
  }

  const isWhAll = selectedWarehouses.includes(ALL_ID);
  const isPrAll = selectedProducts.includes(ALL_ID);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroDeco} />
          <View style={styles.heroIcon}>
            <FileText size={22} color={Colors.white} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Stok Raporu</Text>
            <Text style={styles.heroSubtitle}>
              Depo ve ürün seçin · PDF veya Excel olarak indirin
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryVal}>{reportRows.length}</Text>
            <Text style={styles.summaryLbl}>Satır</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryVal, { color: Colors.info }]}>
              {totalQty}
            </Text>
            <Text style={styles.summaryLbl}>Toplam Stok</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryVal, { color: Colors.danger }]}>
              {criticalCount}
            </Text>
            <Text style={styles.summaryLbl}>Kritik</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <WarehouseIcon size={16} color={Colors.primary} strokeWidth={2.4} />
          <Text style={styles.sectionLabel}>DEPO SEÇİMİ</Text>
        </View>
        <View style={styles.chipWrap}>
          <TouchableOpacity
            style={[styles.chip, isWhAll && styles.chipActive]}
            onPress={() => toggleWarehouse(ALL_ID)}
            activeOpacity={0.8}
            testID="wh-all"
          >
            {isWhAll && <Check size={13} color={Colors.white} strokeWidth={3} />}
            <Text style={[styles.chipText, isWhAll && styles.chipTextActive]}>
              Tüm Depolar
            </Text>
          </TouchableOpacity>
          {warehouses.map((w) => {
            const active = !isWhAll && selectedWarehouses.includes(w.id);
            return (
              <TouchableOpacity
                key={w.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleWarehouse(w.id)}
                activeOpacity={0.8}
                testID={`wh-${w.id}`}
              >
                {active && <Check size={13} color={Colors.white} strokeWidth={3} />}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {w.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
          <Package size={16} color={Colors.primary} strokeWidth={2.4} />
          <Text style={styles.sectionLabel}>ÜRÜN SEÇİMİ</Text>
        </View>
        <View style={styles.chipWrap}>
          <TouchableOpacity
            style={[styles.chip, isPrAll && styles.chipActive]}
            onPress={() => toggleProduct(ALL_ID)}
            activeOpacity={0.8}
            testID="pr-all"
          >
            {isPrAll && <Check size={13} color={Colors.white} strokeWidth={3} />}
            <Text style={[styles.chipText, isPrAll && styles.chipTextActive]}>
              Tüm Ürünler
            </Text>
          </TouchableOpacity>
          {products.map((p) => {
            const active = !isPrAll && selectedProducts.includes(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleProduct(p.id)}
                activeOpacity={0.8}
                testID={`pr-${p.id}`}
              >
                {active && <Check size={13} color={Colors.white} strokeWidth={3} />}
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <CheckCircle2 size={16} color={Colors.success} strokeWidth={2.4} />
            <Text style={styles.previewTitle}>Rapor Önizleme</Text>
          </View>
          <Text style={styles.previewText}>
            {reportRows.length === 0
              ? 'Seçilen filtrelere uygun stok kaydı bulunmuyor.'
              : `${effectiveWarehouses.length} depo · ${effectiveProducts.length} ürün · ${reportRows.length} stok satırı`}
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.downloadBtn, styles.downloadBtnPdf]}
          onPress={handlePdf}
          activeOpacity={0.9}
          disabled={isGenerating}
          testID="download-pdf-btn"
        >
          {generatePdfMutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <FileText size={18} color={Colors.white} strokeWidth={2.6} />
              <Text style={styles.downloadText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.downloadBtn, styles.downloadBtnExcel]}
          onPress={handleExcel}
          activeOpacity={0.9}
          disabled={isGenerating}
          testID="download-excel-btn"
        >
          {generateExcelMutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Sheet size={18} color={Colors.white} strokeWidth={2.6} />
              <Text style={styles.downloadText}>Excel</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 20 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    gap: 12,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  heroDeco: {
    position: 'absolute' as const,
    top: -30,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  summaryLbl: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxWidth: '100%',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: '700' as const,
  },
  previewCard: {
    marginTop: 18,
    backgroundColor: Colors.successLight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.success,
    letterSpacing: 0.4,
  },
  previewText: { fontSize: 13, color: Colors.text, fontWeight: '500' as const },
  bottomSpacer: { height: 90 },
  footer: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    paddingBottom: 18,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexDirection: 'row',
    gap: 10,
  },
  downloadBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadBtnPdf: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  downloadBtnExcel: {
    backgroundColor: '#1D6F42',
    shadowColor: '#1D6F42',
  },
  downloadText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: -0.2,
  },
});
