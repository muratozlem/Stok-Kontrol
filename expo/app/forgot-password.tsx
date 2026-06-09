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
import { Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, Send } from 'lucide-react-native';
import Colors from '@/constants/colors';

const BLUE   = '#3ABEDB';
const GREEN  = '#7DC242';
const YELLOW = '#F5C225';
const ORANGE = '#F07D28';

const EDGE_URL = 'https://estefjjfccejhbskevvm.supabase.co/functions/v1/password-reset';

type Step = 'email' | 'code';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;

  const codeRef = useRef<TextInput>(null);
  const newPassRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateStep = () => {
    stepAnim.setValue(40);
    Animated.timing(stepAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start();
  };

  const handleSendCode = async () => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError('E-posta adresi boş bırakılamaz'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError('Geçerli bir e-posta adresi giriniz'); return; }

    setIsLoading(true);
    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: cleanEmail }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Kod gönderilemedi');
      animateStep();
      setStep('code');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu. Tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    if (!code || code.length !== 6) { setError('6 haneli kodu eksiksiz girin'); return; }
    if (!newPassword || newPassword.length < 6) { setError('Yeni şifre en az 6 karakter olmalı'); return; }
    if (newPassword !== confirmPassword) { setError('Şifreler eşleşmiyor'); return; }

    setIsLoading(true);
    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', email: email.trim().toLowerCase(), code, newPassword }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Şifre güncellenemedi');
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu. Tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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

          <View style={styles.scrollContent}>
            <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.accentBar}>
                <View style={[styles.accentDot, { backgroundColor: GREEN }]} />
                <View style={[styles.accentDot, { backgroundColor: GREEN }]} />
                <View style={[styles.accentDot, { backgroundColor: GREEN }]} />
                <View style={[styles.accentDot, { backgroundColor: GREEN }]} />
              </View>
              <View style={styles.successIcon}>
                <CheckCircle2 size={56} color={GREEN} />
              </View>
              <Text style={styles.title}>Şifre Güncellendi!</Text>
              <Text style={styles.subtitle}>Yeni şifrenizle giriş yapabilirsiniz.</Text>
              <TouchableOpacity style={styles.mainButton} onPress={() => router.replace('/login')} activeOpacity={0.85}>
                <Text style={styles.mainButtonText}>Giriş Yap</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </>
    );
  }

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

              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, step === 'email' ? styles.stepDotActive : styles.stepDotDone]}>
                  <Text style={styles.stepDotText}>1</Text>
                </View>
                <View style={[styles.stepLine, step === 'code' && styles.stepLineDone]} />
                <View style={[styles.stepDot, step === 'code' ? styles.stepDotActive : styles.stepDotInactive]}>
                  <Text style={[styles.stepDotText, step !== 'code' && styles.stepDotTextInactive]}>2</Text>
                </View>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {step === 'email' ? (
                <Animated.View style={{ transform: [{ translateY: stepAnim }] }}>
                  <Text style={styles.title}>Şifremi Unuttum</Text>
                  <Text style={styles.subtitle}>E-posta adresinize 6 haneli sıfırlama kodu göndereceğiz.</Text>

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
                        onSubmitEditing={handleSendCode}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.mainButton, isLoading && styles.buttonDisabled]}
                    onPress={handleSendCode}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <>
                        <Send size={18} color={Colors.white} />
                        <Text style={styles.mainButtonText}>Kod Gönder</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <Animated.View style={{ transform: [{ translateY: stepAnim }] }}>
                  <Text style={styles.title}>Kodu Girin</Text>
                  <Text style={styles.subtitle}>
                    <Text style={styles.emailHighlight}>{email}</Text>
                    {' '}adresine gönderilen 6 haneli kodu ve yeni şifrenizi girin.
                  </Text>

                  <View style={styles.inputGroup}>
                    <View style={styles.inputWrapper}>
                      <View style={[styles.inputAccent, { backgroundColor: YELLOW }]} />
                      <KeyRound size={18} color={Colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        ref={codeRef}
                        style={[styles.input, styles.codeInput]}
                        placeholder="_ _ _ _ _ _"
                        placeholderTextColor={Colors.textMuted}
                        value={code}
                        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        returnKeyType="next"
                        onSubmitEditing={() => newPassRef.current?.focus()}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <View style={[styles.inputAccent, { backgroundColor: ORANGE }]} />
                      <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        ref={newPassRef}
                        style={styles.input}
                        placeholder="Yeni şifre (en az 6 karakter)"
                        placeholderTextColor={Colors.textMuted}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={() => confirmRef.current?.focus()}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                        {showPassword ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputWrapper}>
                      <View style={[styles.inputAccent, { backgroundColor: GREEN }]} />
                      <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        ref={confirmRef}
                        style={styles.input}
                        placeholder="Yeni şifre (tekrar)"
                        placeholderTextColor={Colors.textMuted}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirm}
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={handleConfirm}
                      />
                      <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                        {showConfirm ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.mainButton, isLoading && styles.buttonDisabled]}
                    onPress={handleConfirm}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color={Colors.white} />
                        <Text style={styles.mainButtonText}>Şifremi Güncelle</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendLink}
                    onPress={() => { setError(null); setCode(''); setStep('email'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resendLinkText}>Kodu almadım — tekrar gönder</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backLink} activeOpacity={0.7}>
                <ArrowLeft size={15} color={Colors.textSecondary} />
                <Text style={styles.backLinkText}>Giriş sayfasına dön</Text>
              </TouchableOpacity>
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
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 0 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#1A1D2E' },
  stepDotDone: { backgroundColor: GREEN },
  stepDotInactive: { backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: Colors.border },
  stepDotText: { fontSize: 12, fontWeight: '700' as const, color: '#fff' },
  stepDotTextInactive: { color: Colors.textMuted },
  stepLine: { width: 40, height: 2, backgroundColor: Colors.borderLight, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: GREEN },
  title: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 22, lineHeight: 19 },
  emailHighlight: { fontWeight: '700' as const, color: Colors.text },
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
  codeInput: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 6, textAlign: 'center' },
  eyeButton: { padding: 6 },
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
  resendLink: { marginTop: 14, alignItems: 'center' },
  resendLinkText: { fontSize: 13, color: BLUE, fontWeight: '600' as const },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 20 },
  backLinkText: { fontSize: 13, color: Colors.textSecondary },
  successIcon: { alignItems: 'center', marginBottom: 16, marginTop: 4 },
});
