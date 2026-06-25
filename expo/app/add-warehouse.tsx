import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Save, MapPin, Warehouse, FileText, Lock, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';

export default function AddWarehousePage() {
  const { addWarehouse, locations } = useData();
  const { isAdmin, isChef, isSuperAdmin, currentUser } = useAuth();

  const [name, setName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    isSuperAdmin ? null : (currentUser?.locationId ?? null)
  );
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (!isAdmin && !isChef) {
    return (
      <View style={styles.denied}>
        <View style={styles.deniedIconWrap}>
          <Lock size={36} color={Colors.textMuted} strokeWidth={2} />
        </View>
        <Text style={styles.deniedTitle}>Yetki Gerekli</Text>
        <Text style={styles.deniedText}>
          Depo oluşturma yetkisine sahip değilsiniz. Bu işlem Süper Admin, İdari İşler ve Şef tarafından yapılabilir.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setSaveError('Depo adı zorunludur.');
      return;
    }
    setIsSaving(true);
    setSaveError('');
    try {
      const locationIdToUse = isSuperAdmin ? selectedLocationId : (currentUser?.locationId ?? null);
      await addWarehouse({
        name: name.trim(),
        location: location.trim(),
        description: description.trim(),
        locationId: locationIdToUse,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      const msg = (err as Error).message ?? '';
      console.log('[AddWarehouse] Save error:', msg);
      if (msg.includes('row-level security')) {
        setSaveError('Yetki hatası: Depo ekleme yetkiniz yok.');
      } else if (msg.includes('fetch') || msg.includes('network')) {
        setSaveError('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
      } else {
        setSaveError('Depo kaydedilemedi: ' + (msg || 'Bilinmeyen hata'));
      }
    } finally {
      setIsSaving(false);
    }
  }, [name, location, description, addWarehouse, isSuperAdmin, selectedLocationId, currentUser]);

  const selectedLocationName = locations.find(l => l.id === selectedLocationId)?.name;

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
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconHeader}
        >
          <View style={styles.iconHeaderDeco} />
          <View style={styles.iconCircle}>
            <Warehouse size={30} color={Colors.white} strokeWidth={2.2} />
          </View>
          <Text style={styles.headerTitle}>Yeni Depo Oluştur</Text>
          <Text style={styles.headerSubtitle}>
            Depo bilgilerini girerek yeni bir depo tanımlayın
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.label}>Depo Adı *</Text>
          <View style={styles.inputWrap}>
            <Warehouse size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Örn: Ana Depo"
              placeholderTextColor={Colors.textMuted}
              testID="warehouse-name-input"
            />
          </View>

          <Text style={styles.label}>Konum Notu</Text>
          <View style={styles.inputWrap}>
            <MapPin size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Kat, bina, adres notu (opsiyonel)"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <Text style={styles.label}>Açıklama</Text>
          <View style={[styles.inputWrap, styles.inputWrapMulti]}>
            <FileText size={18} color={Colors.textMuted} style={styles.iconTop} />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Depo açıklaması (opsiyonel)"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {isSuperAdmin ? (
            <>
              <Text style={styles.label}>Lokasyon</Text>
              <TouchableOpacity
                style={styles.inputWrap}
                onPress={() => setLocationPickerOpen(v => !v)}
                activeOpacity={0.7}
              >
                <MapPin size={18} color={Colors.textMuted} />
                <Text style={[styles.input, !selectedLocationId && { color: Colors.textMuted }]}>
                  {selectedLocationName ?? 'Lokasyon seçin (opsiyonel)'}
                </Text>
                {locationPickerOpen
                  ? <ChevronUp size={18} color={Colors.textMuted} />
                  : <ChevronDown size={18} color={Colors.textMuted} />
                }
              </TouchableOpacity>
              {locationPickerOpen && (
                <View style={styles.pickerList}>
                  <TouchableOpacity
                    style={[styles.pickerItem, !selectedLocationId && styles.pickerItemSelected]}
                    onPress={() => { setSelectedLocationId(null); setLocationPickerOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerItemText, !selectedLocationId && styles.pickerItemTextSelected]}>
                      — Lokasyon atama
                    </Text>
                  </TouchableOpacity>
                  {locations.map(loc => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.pickerItem, selectedLocationId === loc.id && styles.pickerItemSelected]}
                      onPress={() => { setSelectedLocationId(loc.id); setLocationPickerOpen(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerItemText, selectedLocationId === loc.id && styles.pickerItemTextSelected]}>
                        {loc.name}{loc.city ? ` — ${loc.city}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            currentUser?.locationId && (
              <>
                <Text style={styles.label}>Lokasyon</Text>
                <View style={[styles.inputWrap, styles.inputWrapReadonly]}>
                  <MapPin size={18} color={Colors.primary} />
                  <Text style={[styles.input, { color: Colors.primary }]}>
                    {locations.find(l => l.id === currentUser.locationId)?.name ?? 'Kendi lokasyonunuz'}
                  </Text>
                  <Lock size={14} color={Colors.textMuted} />
                </View>
              </>
            )
          )}
        </View>

        {!!saveError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || isSaving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.9}
          disabled={!name.trim() || isSaving}
          testID="save-warehouse-btn"
        >
          <LinearGradient
            colors={name.trim() && !isSaving ? [Colors.gradientStart, Colors.gradientEnd] : ['#ccc', '#bbb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Save size={20} color={Colors.white} strokeWidth={2.4} />
                <Text style={styles.saveButtonText}>Depoyu Kaydet</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  denied: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  deniedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  deniedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  backButtonText: {
    color: Colors.white,
    fontWeight: '700' as const,
    fontSize: 15,
  },
  iconHeader: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 24,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  iconHeaderDeco: {
    position: 'absolute' as const,
    top: -50,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputWrapMulti: {
    alignItems: 'flex-start' as const,
    paddingVertical: 12,
  },
  inputWrapReadonly: {
    backgroundColor: Colors.primaryVeryLight,
    borderColor: Colors.primary,
  },
  iconTop: { marginTop: 3 },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: { minHeight: 80 },
  pickerList: {
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primaryVeryLight,
  },
  pickerItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  saveButton: {
    marginTop: 22,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
  bottomSpacer: { height: 40 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
