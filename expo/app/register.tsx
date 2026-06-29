'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, KeyRound, MapPin, ChevronDown, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

const BLUE   = '#3ABEDB';
const GREEN  = '#7DC242';
const YELLOW = '#F5C225';
const ORANGE = '#F07D28';

interface Location {
  id: string;
  name: string;
}

export default function RegisterScreen() {
  const { register, isRegistering, registerError, resetRegisterError } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [bootstrapToken, setBootstrapToken] = useState<string>('');
  const [showBootstrapField, setShowBootstrapField] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const [locationId, setLocationId] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLocationsLoading(false); return; }
    supabase
      .from('locations')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setLocations(data as Location[]);
        setLocationsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (registerError) {
      setLocalError(registerError);
      resetRegisterError();
    }
  }, [registerError]);

  const selectedLocation = locations.find(l => l.id === locationId);

  const handleRegister = async () => {
    setLocalError(null);
    setPendingMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) { setLocalError('E-posta adresi boş bırakılamaz'); return; }
    if (!emailRegex.test(cleanEmail)) { setLocalError('Geçerli bir e-posta adresi giriniz'); return; }
    if (!password) { setLocalError('Şifre boş bırakılamaz'); return; }
    if (password.length < 6) { setLocalError('Şifre en az 6 karakter olmalıdır'); return; }
    if (password !== confirmPassword) { setLocalError('Şifreler eşleşmiyor'); return; }
    if (showBootstrapField && !bootstrapToken.trim()) {
      setLocalError('Kurulum tokeni boş bırakılamaz'); return;
    }
    if (!showBootstrapField && !locationId) {
      setLocalError('Lütfen çalıştığınız lokasyonu seçiniz'); return;
    }
    try {
      const token = showBootstrapField ? bootstrapToken.trim() : undefined;
      const locId = showBootstrapField ? undefined : locationId;
      const user = await register(cleanEmail, password, token, locId);
      if (user.status === 'pending') {
        setPendingMessage('Kayıt talebiniz alındı. Hesabınız admin tarafından onaylandıktan sonra giriş yapabilirsiniz.');
        setEmail(''); setPassword(''); setConfirmPassword(''); setBootstrapToken(''); setLocationId('');
      }
    } catch (e: unknown) {
      const err = e as Error & { bootstrapRequired?: boolean };
      if (err.bootstrapRequired) {
        setShowBootstrapField(true);
      }
      setLocalError(err.message ?? 'Kayıt sırasında bir hata oluştu');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.colorBar}>
            <View style={[styles.colorStripe, { backgroundColor: BLUE }]} />
            <View style={[styles.colorStripe, { backgroundColor: GREEN }]} />
            <View style={[styles.colorStripe, { backgroundColor: YELLOW }]} />
            <View style={[styles.colorStripe, { backgroundColor: ORANGE }]} />
          </View>

          <Animated.View style={[styles.logoArea, { transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoWrapper}>
              <Image source={require('../assets/images/logo.png')} style={{ width: 72, height: 72, borderRadius: 16 }} />
            </View>
            <Text style={styles.appName}>Stok Kontrol</Text>
          </Animated.View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.accentBar}>
                <View style={[styles.accentDot, { backgroundColor: BLUE }]} />
                <View style={[styles.accentDot, { backgroundColor: GREEN }]} />
                <View style={[styles.accentDot, { backgroundColor: YELLOW }]} />
                <View style={[styles.accentDot, { backgroundColor: ORANGE }]} />
              </View>
              <Text style={styles.title}>Hesap Oluştur</Text>
              <Text style={styles.subtitle}>E-posta adresiniz ile üye olun</Text>

              {pendingMessage && (
                <View style={styles.successBox}>
                  <CheckCircle2 size={18} color={GREEN} />
                  <Text style={styles.successText}>{pendingMessage}</Text>
                </View>
              )}

              {localError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{localError}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <View style={[styles.inputAccent, { backgroundColor: BLUE }]} />
                  <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="E-posta adresi"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    testID="register-email"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={[styles.inputAccent, { backgroundColor: GREEN }]} />
                  <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Şifre (en az 6 karakter)"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    testID="register-password"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    {showPassword ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <View style={[styles.inputAccent, { backgroundColor: ORANGE }]} />
                  <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    ref={confirmRef}
                    style={styles.input}
                    placeholder="Şifre Tekrar"
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    testID="register-confirm"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                    {showConfirm ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
                  </TouchableOpacity>
                </View>

                {!showBootstrapField && (
                  <TouchableOpacity
                    style={[styles.inputWrapper, styles.locationButton, locationId ? styles.locationSelected : null]}
                    onPress={() => setShowLocationPicker(true)}
                    activeOpacity={0.7}
                    testID="register-location"
                  >
                    <View style={[styles.inputAccent, { backgroundColor: YELLOW }]} />
                    <MapPin size={18} color={locationId ? YELLOW : Colors.textMuted} style={styles.inputIcon} />
                    <Text style={[styles.locationButtonText, locationId ? styles.locationButtonTextSelected : null]}>
                      {locationsLoading
                        ? 'Lokasyonlar yükleniyor...'
                        : selectedLocation
                          ? selectedLocation.name
                          : 'Lokasyon seçiniz *'}
                    </Text>
                    <ChevronDown size={16} color={locationId ? YELLOW : Colors.textMuted} />
                  </TouchableOpacity>
                )}

                {showBootstrapField && (
                  <View style={styles.inputWrapper}>
                    <View style={[styles.inputAccent, { backgroundColor: YELLOW }]} />
                    <KeyRound size={18} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Kurulum Tokeni"
                      placeholderTextColor={Colors.textMuted}
                      value={bootstrapToken}
                      onChangeText={setBootstrapToken}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                      testID="register-bootstrap-token"
                    />
                  </View>
                )}
              </View>

              <View style={styles.infoNote}>
                <View style={styles.infoNoteAccents}>
                  <View style={[styles.infoNoteDot, { backgroundColor: BLUE }]} />
                  <View style={[styles.infoNoteDot, { backgroundColor: YELLOW }]} />
                </View>
                <Text style={styles.infoNoteText}>
                  Üyelik talepleri admin onayı gerektirir. Seçtiğiniz lokasyonun admini talebinizi görecek ve onaylayacaktır.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.registerButton, isRegistering && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isRegistering}
                activeOpacity={0.85}
                testID="register-submit"
              >
                {isRegistering ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Üyelik Talebi Gönder</Text>
                    <ArrowRight size={20} color={Colors.white} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.replace('/login')} style={styles.loginLink} testID="go-to-login">
                <Text style={styles.loginLinkText}>
                  Zaten hesabın var mı?{' '}
                  <Text style={styles.loginLinkBold}>Giriş Yap</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLocationPicker(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lokasyon Seçin</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)} style={styles.modalClose}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalHandle} />
            {locations.length === 0 ? (
              <View style={styles.modalEmpty}>
                <MapPin size={32} color={Colors.textMuted} />
                <Text style={styles.modalEmptyText}>Henüz lokasyon tanımlanmamış</Text>
              </View>
            ) : (
              <FlatList
                data={locations}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.locationItem, item.id === locationId && styles.locationItemSelected]}
                    onPress={() => { setLocationId(item.id); setShowLocationPicker(false); setLocalError(null); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.locationItemDot, { backgroundColor: item.id === locationId ? YELLOW : Colors.border }]} />
                    <Text style={[styles.locationItemText, item.id === locationId && styles.locationItemTextSelected]}>
                      {item.name}
                    </Text>
                    {item.id === locationId && <CheckCircle2 size={18} color={YELLOW} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
  header: {
    backgroundColor: '#1A1D2E',
    paddingTop: Platform.OS === 'web' ? 67 : 56,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  colorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    flexDirection: 'row',
  },
  colorStripe: { flex: 1 },
  logoArea: { alignItems: 'center', marginTop: 8 },
  logoWrapper: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  appName: { fontSize: 22, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: 0.3 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 24,
    shadowColor: '#1A1D2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  accentBar: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 18 },
  accentDot: { width: 28, height: 4, borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: '500' as const },
  successBox: {
    backgroundColor: '#E8F5D6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  successText: { flex: 1, color: '#3D7A1C', fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  inputGroup: { gap: 12, marginBottom: 14 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8FB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
    overflow: 'hidden',
  },
  inputAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text, height: 52 },
  eyeButton: { padding: 6 },
  locationButton: { justifyContent: 'space-between' },
  locationSelected: { borderColor: YELLOW, backgroundColor: '#FFFBEA' },
  locationButtonText: { flex: 1, fontSize: 15, color: Colors.textMuted },
  locationButtonTextSelected: { color: Colors.text, fontWeight: '500' as const },
  infoNote: {
    backgroundColor: '#F0FBFE',
    borderRadius: 10,
    padding: 11,
    marginBottom: 18,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoNoteAccents: { flexDirection: 'column', gap: 3 },
  infoNoteDot: { width: 6, height: 6, borderRadius: 3 },
  infoNoteText: { flex: 1, fontSize: 12, color: '#1A5F70', lineHeight: 17, fontWeight: '500' as const },
  registerButton: {
    backgroundColor: '#1A1D2E',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1A1D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.7 },
  registerButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' as const },
  loginLink: { marginTop: 18, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: Colors.textSecondary },
  loginLinkBold: { color: '#1A1D2E', fontWeight: '700' as const },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  modalClose: { padding: 4 },
  modalList: { paddingHorizontal: 16, paddingVertical: 8 },
  modalEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  modalEmptyText: { fontSize: 14, color: Colors.textSecondary },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginVertical: 2,
  },
  locationItemSelected: { backgroundColor: '#FFFBEA' },
  locationItemDot: { width: 10, height: 10, borderRadius: 5 },
  locationItemText: { flex: 1, fontSize: 15, color: Colors.text },
  locationItemTextSelected: { fontWeight: '600' as const, color: '#7A5C00' },
});
