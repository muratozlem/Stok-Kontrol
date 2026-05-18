import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { X, SwitchCamera, Aperture, Check, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

const CAPTURED_IMAGE_KEY = '__captured_product_image__';

export default function CameraCapturePage() {
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isTaking, setIsTaking] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const handleFlip = useCallback(() => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isTaking) return;
    setIsTaking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    console.log('[CameraCapture] Taking picture...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      if (photo?.uri) {
        console.log('[CameraCapture] Photo taken:', photo.uri.substring(0, 60));
        setCapturedUri(photo.uri);
      }
    } catch (err) {
      console.log('[CameraCapture] Error:', (err as Error).message);
    } finally {
      setIsTaking(false);
    }
  }, [isTaking]);

  const handleRetake = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedUri(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!capturedUri) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[CameraCapture] Confirmed photo, saving to temp storage');
    try {
      await AsyncStorage.setItem(CAPTURED_IMAGE_KEY, capturedUri);
    } catch (e) {
      console.log('[CameraCapture] Failed to save temp image:', (e as Error).message);
    }
    router.back();
  }, [capturedUri]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top + 20 }]}>
        <View style={styles.permissionCard}>
          <Aperture size={48} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionText}>
            Ürün fotoğrafı çekebilmek için kamera erişimine izin vermeniz gerekmektedir.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Text style={styles.permissionBtnText}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionCancelBtn}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionCancelText}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (capturedUri) {
    return (
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: capturedUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        <View style={[styles.previewOverlay, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.previewTitle}>Fotoğrafı Onayla</Text>
        </View>
        <View style={[styles.previewActions, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={handleRetake}
            activeOpacity={0.85}
            testID="retake-btn"
          >
            <RotateCcw size={22} color={Colors.white} />
            <Text style={styles.retakeBtnText}>Tekrar Çek</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            activeOpacity={0.85}
            testID="confirm-photo-btn"
          >
            <Check size={22} color={Colors.white} />
            <Text style={styles.confirmBtnText}>Kullan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        onCameraReady={() => {
          console.log('[CameraCapture] Camera ready');
          setIsCameraReady(true);
        }}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={handleClose}
          activeOpacity={0.8}
          testID="close-camera-btn"
        >
          <X size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.cameraTitle}>Ürün Fotoğrafı</Text>
        {Platform.OS !== 'web' ? (
          <TouchableOpacity
            style={styles.topBtn}
            onPress={handleFlip}
            activeOpacity={0.8}
            testID="flip-camera-btn"
          >
            <SwitchCamera size={22} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBtn} />
        )}
      </View>

      <View style={styles.frameBorder}>
        <View style={styles.frameCornerTL} />
        <View style={styles.frameCornerTR} />
        <View style={styles.frameCornerBL} />
        <View style={styles.frameCornerBR} />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.hintText}>Ürünü çerçeve içine alın</Text>
        <TouchableOpacity
          style={[
            styles.captureBtn,
            (!isCameraReady || isTaking) && styles.captureBtnDisabled,
          ]}
          onPress={handleCapture}
          disabled={!isCameraReady || isTaking}
          activeOpacity={0.8}
          testID="capture-btn"
        >
          {isTaking ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 30;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 14,
    width: '100%',
    maxWidth: 340,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 4,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  permissionBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  permissionCancelBtn: {
    paddingVertical: 10,
  },
  permissionCancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  frameBorder: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    marginTop: -FRAME_SIZE / 2,
    marginLeft: -FRAME_SIZE / 2,
    zIndex: 5,
  },
  frameCornerTL: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: Colors.primary,
    borderTopLeftRadius: 8,
  },
  frameCornerTR: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: Colors.primary,
    borderTopRightRadius: 8,
  },
  frameCornerBL: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 8,
  },
  frameCornerBR: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: Colors.primary,
    borderBottomRightRadius: 8,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 10,
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 18,
  },
  captureBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
  },
  captureBtnDisabled: {
    opacity: 0.4,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  previewTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  previewActions: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  retakeBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
