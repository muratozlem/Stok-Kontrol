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
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

const BLUE   = '#3ABEDB';
const GREEN  = '#7DC242';
const YELLOW = '#F5C225';
const ORANGE = '#F07D28';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError('E-posta adresi boş bırakılamaz'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError('Geçerli bir e-posta adresi giriniz'); return; }

    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) throw new Error('Sistem yapılandırması eksik');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .limit(1);

      if (!profiles || profiles.length === 0) {
        setSubmitted(true);
        return;
      }

      const { error: insertError } = await supabase
        .from('password_reset_requests')
        .insert({ id: generateId(), email: cleanEmail, status: 'pending' });

      if (insertError && !insertError.message.includes('duplicate')) {
        throw new Error(insertError.message);
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu. Tekrar deneyin.');
    } finally {
      setIsLoading(false);
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
                <View style={[styles.accentDot, { backgroundColor: ORANGE }]} />
                <View style={[styles.accentDot, { backgroundColor: YELLOW }]} />
                <View style={[styles.accentDot, { backgroundColor: GREEN }]} />
              </View>

              {submitted ? (
                <View style={styles.successArea}>
                  <View style={styles.successIconWrap}>
                    <ShieldCheck size={52} color={GREEN} />
                  </View>
                  <Text style={styles.title}>Talebiniz Alındı</Text>
                  <Text style={styles.subtitle}>
                    Şifre sıfırlama talebiniz yöneticiye iletildi.{'\n'}
                    Yöneticiniz talebinizi onaylayıp yeni şifrenizi size bildirecektir.
                  </Text>
                  <TouchableOpacity style={styles.mainButton} onPress={() => router.replace('/login')} activeOpacity={0.85}>
                    <Text style={styles.mainButtonText}>Giriş Sayfasına Dön</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.title}>Şifremi Unuttum</Text>
                  <Text style={styles.subtitle}>
                    E-posta adresinizi girin. Talebiniz yöneticiye iletilecek ve yeni şifreniz bildirilecektir.
                  </Text>

                  {error && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
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
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.mainButton, isLoading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <>
                        <Send size={18} color={Colors.white} />
                        <Text style={styles.mainButtonText}>Talep Gönder</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {!submitted && (
                <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backLink} activeOpacity={0.7}>
                  <ArrowLeft size={15} color={Colors.textSecondary} />
                  <Text style={styles.backLinkText}>Giriş sayfasına dön</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
  header: {
    backgroundColor: '#1A1D2E',
    paddingTop: Platform.OS === 'web' ? 67 : 60,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  colorBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 5, flexDirection: 'row' },
  colorStripe: { flex: 1 },
  logoArea: { alignItems: 'center', marginTop: 8 },
  logoWrapper: {
    width: 84, height: 84, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  appName: { fontSize: 22, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: 0.3 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 22, padding: 26,
    shadowColor: '#1A1D2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },
  accentBar: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 18 },
  accentDot: { width: 28, height: 4, borderRadius: 2 },
  title: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 22, lineHeight: 19 },
  errorBox: {
    backgroundColor: Colors.dangerLight, borderRadius: 12, padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: Colors.danger,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: '500' as const },
  inputGroup: { gap: 12, marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F6F8FB', borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, height: 52, overflow: 'hidden',
  },
  inputAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text, height: 52 },
  mainButton: {
    backgroundColor: '#1A1D2E', borderRadius: 14,
    height: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#1A1D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  buttonDisabled: { opacity: 0.7 },
  mainButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' as const },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 20 },
  backLinkText: { fontSize: 13, color: Colors.textSecondary },
  successArea: { alignItems: 'center', paddingVertical: 8 },
  successIconWrap: { marginBottom: 16 },
  CheckCircle2Icon: { marginBottom: 16 },
});
