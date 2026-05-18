import React, { useState, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Camera, Save, ScanBarcode, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useData } from '@/providers/DataProvider';
import { uploadProductImage } from '@/utils/imageUpload';
import Colors from '@/constants/colors';

const CAPTURED_IMAGE_KEY = '__captured_product_image__';

const UNITS = ['Adet', 'Kg', 'Lt', 'Mt', 'Paket', 'Kutu', 'Çuval', 'Ton'];

export default function AddProductPage() {
  const { addProduct } = useData();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const [name, setName] = useState<string>('');
  const [barcode, setBarcode] = useState<string>(params.barcode ?? '');
  const [description, setDescription] = useState<string>('');
  const [unit, setUnit] = useState<string>('Adet');
  const [criticalLevel, setCriticalLevel] = useState<string>('10');
  const [imageUri, setImageUri] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      const checkCapturedImage = async () => {
        try {
          const uri = await AsyncStorage.getItem(CAPTURED_IMAGE_KEY);
          if (uri) {
            console.log('[AddProduct] Found captured image from camera');
            setImageUri(uri);
            await AsyncStorage.removeItem(CAPTURED_IMAGE_KEY);
          }
        } catch (e) {
          console.log('[AddProduct] Error reading captured image:', (e as Error).message);
        }
      };
      checkCapturedImage();
    }, [])
  );

  const pickFromGallery = useCallback(async () => {
    console.log('[AddProduct] Opening image picker');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      console.log('[AddProduct] Gallery image selected');
    }
  }, []);

  const openCamera = useCallback(() => {
    console.log('[AddProduct] Opening camera capture');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/camera-capture');
  }, []);

  const showImageOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Ürün Görseli',
      'Fotoğraf kaynağını seçin',
      [
        { text: 'Kamera ile Çek', onPress: openCamera },
        { text: 'Galeriden Seç', onPress: pickFromGallery },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  }, [openCamera, pickFromGallery]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Ürün adı zorunludur.');
      return;
    }

    setIsSaving(true);
    console.log('[AddProduct] Saving product:', name.trim());

    try {
      let finalImageUrl = '';

      if (imageUri) {
        setIsUploading(true);
        console.log('[AddProduct] Uploading image to Supabase...');
        finalImageUrl = await uploadProductImage(imageUri, barcode.trim(), name.trim());
        setIsUploading(false);
        console.log('[AddProduct] Image URL:', finalImageUrl.substring(0, 60));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await addProduct({
        name: name.trim(),
        barcode: barcode.trim(),
        description: description.trim(),
        unit,
        imageUrl: finalImageUrl,
        criticalStockLevel: parseInt(criticalLevel, 10) || 0,
      });

      router.back();
    } catch (err) {
      console.log('[AddProduct] Save error:', (err as Error).message);
      Alert.alert('Hata', 'Ürün kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  }, [name, barcode, description, unit, imageUri, criticalLevel, addProduct]);

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
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={showImageOptions}
          activeOpacity={0.8}
          testID="image-picker-btn"
        >
          {imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
              <View style={styles.imageEditBadge}>
                <Camera size={14} color={Colors.white} />
              </View>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Camera size={32} color={Colors.primary} />
              <Text style={styles.imageText}>Fotoğraf Ekle</Text>
              <View style={styles.imageOptionsRow}>
                <View style={styles.imageOptionChip}>
                  <Camera size={12} color={Colors.textSecondary} />
                  <Text style={styles.imageOptionText}>Kamera</Text>
                </View>
                <View style={styles.imageOptionChip}>
                  <ImageIcon size={12} color={Colors.textSecondary} />
                  <Text style={styles.imageOptionText}>Galeri</Text>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {isUploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.uploadingText}>Görsel yükleniyor...</Text>
          </View>
        )}

        <Text style={styles.label}>Ürün Adı *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ürün adını girin"
          placeholderTextColor={Colors.textMuted}
          testID="product-name-input"
        />

        <Text style={styles.label}>Barkod</Text>
        <View style={styles.barcodeRow}>
          <TextInput
            style={[styles.input, styles.barcodeInput]}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Barkod numarası"
            placeholderTextColor={Colors.textMuted}
            testID="product-barcode-input"
          />
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/barcode-scanner?mode=addProduct');
            }}
            activeOpacity={0.8}
            testID="scan-barcode-btn"
          >
            <ScanBarcode size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Açıklama</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Ürün açıklaması (opsiyonel)"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Birim</Text>
        <View style={styles.unitRow}>
          {UNITS.map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitChip, unit === u && styles.unitChipActive]}
              onPress={() => setUnit(u)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitChipText,
                  unit === u && styles.unitChipTextActive,
                ]}
              >
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Kritik Stok Seviyesi</Text>
        <TextInput
          style={styles.input}
          value={criticalLevel}
          onChangeText={setCriticalLevel}
          placeholder="10"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          testID="critical-level-input"
        />

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isSaving}
          testID="save-product-btn"
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color={Colors.white} />
              <Text style={styles.saveButtonText}>
                {isUploading ? 'Görsel Yükleniyor...' : 'Kaydediliyor...'}
              </Text>
            </>
          ) : (
            <>
              <Save size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Ürünü Kaydet</Text>
            </>
          )}
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
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  imagePreviewWrap: {
    position: 'relative' as const,
  },
  imagePreview: {
    width: 130,
    height: 130,
    borderRadius: 18,
  },
  imageEditBadge: {
    position: 'absolute' as const,
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  imagePlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 18,
    backgroundColor: Colors.primaryVeryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  imageText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  imageOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  imageOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  imageOptionText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: Colors.primaryVeryLight,
    borderRadius: 10,
  },
  uploadingText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  unitChipTextActive: {
    color: Colors.white,
  },
  barcodeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  barcodeInput: {
    flex: 1,
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 28,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  bottomSpacer: {
    height: 40,
  },
});
