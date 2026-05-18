import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import {
  X,
  Zap,
  ZapOff,
  ScanBarcode,
  Keyboard,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useData } from '@/providers/DataProvider';
import Colors from '@/constants/colors';

const BEEP_URL = 'https://cdn.freesound.org/previews/234/234524_1676145-lq.mp3';

type ScanMode = 'addProduct' | 'stockTransaction' | 'search';

export default function BarcodeScannerPage() {
  const params = useLocalSearchParams<{
    mode?: string;
    txType?: string;
    warehouseId?: string;
  }>();
  const mode = (params.mode as ScanMode) ?? 'search';
  const { getProductByBarcode } = useData();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);
  const [torch, setTorch] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    console.log('[BarcodeScanner] Initializing audio mode');
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    }).catch((e) => console.log('[BarcodeScanner] Audio mode error:', e));

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const playBeep = useCallback(async () => {
    try {
      console.log('[BarcodeScanner] Playing beep sound');
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: BEEP_URL },
        { shouldPlay: true, volume: 1.0, isMuted: false }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) soundRef.current = null;
        }
      });
    } catch (e) {
      console.log('[BarcodeScanner] Beep playback error:', e);
      try {
        const { sound: fallback } = await Audio.Sound.createAsync(
          {
            uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
          },
          { shouldPlay: true, volume: 1.0 }
        );
        soundRef.current = fallback;
        fallback.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            fallback.unloadAsync().catch(() => {});
            if (soundRef.current === fallback) soundRef.current = null;
          }
        });
      } catch (fallbackErr) {
        console.log('[BarcodeScanner] Fallback beep failed:', fallbackErr);
      }
    }
  }, []);

  useEffect(() => {
    console.log(
      '[BarcodeScanner] Permission status:',
      JSON.stringify(permission)
    );
  }, [permission]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const handleBarCodeScanned = useCallback(
    ({ data, type }: { data: string; type: string }) => {
      if (scanned) return;
      setScanned(true);
      console.log(`[BarcodeScanner] Scanned: type=${type}, data=${data}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playBeep();

      const existingProduct = getProductByBarcode(data);

      if (mode === 'addProduct') {
        if (existingProduct) {
          Alert.alert(
            'Ürün Mevcut',
            `"${existingProduct.name}" barkodu zaten kayıtlı.`,
            [
              {
                text: 'Detay Gör',
                onPress: () => {
                  router.replace(
                    `/product-detail?id=${existingProduct.id}`
                  );
                },
              },
              { text: 'Tekrar Tara', onPress: () => setScanned(false) },
            ]
          );
        } else {
          router.replace(`/add-product?barcode=${encodeURIComponent(data)}`);
        }
      } else if (mode === 'stockTransaction') {
        if (existingProduct) {
          const txParams = new URLSearchParams();
          txParams.set('productId', existingProduct.id);
          if (params.txType) txParams.set('type', params.txType);
          if (params.warehouseId)
            txParams.set('warehouseId', params.warehouseId);
          router.replace(`/stock-transaction?${txParams.toString()}`);
        } else {
          Alert.alert(
            'Ürün Bulunamadı',
            `"${data}" barkodlu ürün bulunamadı. Yeni ürün eklemek ister misiniz?`,
            [
              {
                text: 'Ürün Ekle',
                onPress: () => {
                  router.replace(
                    `/add-product?barcode=${encodeURIComponent(data)}`
                  );
                },
              },
              { text: 'Tekrar Tara', onPress: () => setScanned(false) },
            ]
          );
        }
      } else {
        if (existingProduct) {
          router.replace(`/product-detail?id=${existingProduct.id}`);
        } else {
          Alert.alert(
            'Ürün Bulunamadı',
            `"${data}" barkodlu ürün bulunamadı. Yeni ürün eklemek ister misiniz?`,
            [
              {
                text: 'Ürün Ekle',
                onPress: () => {
                  router.replace(
                    `/add-product?barcode=${encodeURIComponent(data)}`
                  );
                },
              },
              { text: 'Tekrar Tara', onPress: () => setScanned(false) },
              {
                text: 'Kapat',
                style: 'cancel',
                onPress: () => router.back(),
              },
            ]
          );
        }
      }
    },
    [scanned, mode, getProductByBarcode, params.txType, params.warehouseId, playBeep]
  );

  const getModeTitle = useCallback(() => {
    switch (mode) {
      case 'addProduct':
        return 'Ürün Ekle - Barkod Tara';
      case 'stockTransaction':
        return 'Stok İşlemi - Barkod Tara';
      default:
        return 'Barkod Tara';
    }
  }, [mode]);

  const handleManualSubmit = useCallback(() => {
    const code = manualInput.trim();
    if (!code) {
      Alert.alert('Hata', 'Lütfen bir barkod numarası girin.');
      return;
    }
    console.log('[BarcodeScanner] Manual barcode entry:', code);
    handleBarCodeScanned({ data: code, type: 'manual' });
  }, [manualInput, handleBarCodeScanned]);

  const renderManualEntry = () => (
    <View style={styles.manualSection}>
      <View style={styles.manualDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>veya manuel girin</Text>
        <View style={styles.dividerLine} />
      </View>
      <View style={styles.manualRow}>
        <View style={styles.manualInputWrap}>
          <Keyboard size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.manualInput}
            value={manualInput}
            onChangeText={setManualInput}
            placeholder="Barkod numarası yazın..."
            placeholderTextColor={Colors.textMuted}
            keyboardType="default"
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={handleManualSubmit}
            testID="manual-barcode-input"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.manualSubmitBtn,
            !manualInput.trim() && styles.manualSubmitBtnDisabled,
          ]}
          onPress={handleManualSubmit}
          activeOpacity={0.8}
          disabled={!manualInput.trim()}
          testID="manual-barcode-submit"
        >
          <ArrowRight size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.permText}>Kamera izinleri yükleniyor...</Text>
        {renderManualEntry()}
        <TouchableOpacity
          style={styles.permBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
          testID="perm-loading-back"
        >
          <Text style={styles.permBackBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.permIconWrap}>
          <ScanBarcode size={48} color={Colors.primary} />
        </View>
        <Text style={styles.permTitle}>Kamera İzni Gerekli</Text>
        <Text style={styles.permText}>
          Barkod taramak için kamera erişimine izin vermeniz gerekiyor.
          {Platform.OS === 'web'
            ? '\nTarayıcınız kamera erişimi izni isteyecektir.'
            : ''}
        </Text>
        <TouchableOpacity
          style={styles.permButton}
          onPress={async () => {
            console.log('[BarcodeScanner] Requesting camera permission');
            try {
              const result = await requestPermission();
              console.log(
                '[BarcodeScanner] Permission result:',
                JSON.stringify(result)
              );
            } catch (e) {
              console.log('[BarcodeScanner] Permission request error:', e);
              Alert.alert(
                'Hata',
                'Kamera izni alınamadı. Cihaz ayarlarından izin verebilirsiniz.'
              );
            }
          }}
          activeOpacity={0.85}
          testID="request-perm-btn"
        >
          <Text style={styles.permButtonText}>Kamera İzni Ver</Text>
        </TouchableOpacity>
        {renderManualEntry()}
        <TouchableOpacity
          style={styles.permBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
          testID="perm-denied-back"
        >
          <Text style={styles.permBackBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={Platform.OS !== 'web' ? torch : false}
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'qr',
            'code128',
            'code39',
            'upc_a',
            'upc_e',
            'codabar',
            'itf14',
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        onCameraReady={() => {
          console.log('[BarcodeScanner] Camera is ready');
          setCameraReady(true);
        }}
        onMountError={(e) => {
          console.log('[BarcodeScanner] Camera mount error:', e);
        }}
      />

      {!cameraReady && (
        <View style={styles.cameraLoading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.cameraLoadingText}>Kamera başlatılıyor...</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
            testID="scanner-close-btn"
          >
            <X size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{getModeTitle()}</Text>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity
              style={styles.topBtn}
              onPress={() => {
                setTorch(!torch);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.8}
              testID="torch-toggle-btn"
            >
              {torch ? (
                <ZapOff size={22} color={Colors.warning} />
              ) : (
                <Zap size={22} color={Colors.white} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.topBtnPlaceholder} />
          )}
        </View>

        <View style={styles.scanArea}>
          <Animated.View style={[styles.scanFrame, { opacity: pulseAnim }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </Animated.View>
          <Animated.View
            style={[
              styles.scanLine,
              {
                opacity: pulseAnim,
                transform: [
                  { translateY: Animated.multiply(pulseAnim, 100) },
                ],
              },
            ]}
          />
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.hintText}>
            Barkodu çerçeve içine hizalayın
          </Text>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => setScanned(false)}
              activeOpacity={0.85}
              testID="rescan-btn"
            >
              <ScanBarcode size={20} color={Colors.white} />
              <Text style={styles.rescanText}>Tekrar Tara</Text>
            </TouchableOpacity>
          )}
          {Platform.OS === 'web' && (
            <View style={styles.webManualSection}>
              {renderManualEntry()}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;
const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative' as const,
  },
  corner: {
    position: 'absolute' as const,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: Colors.primary,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  scanLine: {
    position: 'absolute' as const,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 80,
    gap: 16,
  },
  hintText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  rescanText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  permText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  permButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  permButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  permBackBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  permBackBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  cameraLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  cameraLoadingText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600' as const,
  },
  webManualSection: {
    width: 320,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  manualSection: {
    width: '100%' as const,
    marginTop: 8,
  },
  manualDivider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  manualRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  manualInputWrap: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  manualInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  manualSubmitBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  manualSubmitBtnDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
  },
});
