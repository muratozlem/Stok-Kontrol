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
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Save, MapPin, Warehouse, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/providers/DataProvider';
import Colors from '@/constants/colors';

export default function AddWarehousePage() {
  const { addWarehouse } = useData();
  const [name, setName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Depo adı zorunludur.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addWarehouse({
      name: name.trim(),
      location: location.trim(),
      description: description.trim(),
    });
    router.back();
  }, [name, location, description, addWarehouse]);

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

          <Text style={styles.label}>Konum</Text>
          <View style={styles.inputWrap}>
            <MapPin size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Konum bilgisi (opsiyonel)"
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
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.9}
          testID="save-warehouse-btn"
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            <Save size={20} color={Colors.white} strokeWidth={2.4} />
            <Text style={styles.saveButtonText}>Depoyu Kaydet</Text>
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
  iconTop: {
    marginTop: 3,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 80,
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
  bottomSpacer: {
    height: 40,
  },
});
