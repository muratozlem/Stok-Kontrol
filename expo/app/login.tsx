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
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';

const BLUE   = '#3ABEDB';
const GREEN  = '#7DC242';
const YELLOW = '#F5C225';
const ORANGE = '#F07D28';


export default function LoginScreen() {
  const { login, isLoggingIn, loginError, resetLoginError } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (loginError) {
      setLocalError(loginError);
      resetLoginError();
    }
  }, [loginError]);

  const handleLogin = async () => {
    setLocalError(null);
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) { setLocalError('E-posta adresi boş bırakılamaz'); return; }
    if (!emailRegex.test(cleanEmail)) { setLocalError('Geçerli bir e-posta adresi giriniz'); return; }
    if (!password) { setLocalError('Şifre boş bırakılamaz'); return; }
    try {
      await login(cleanEmail, password);
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : 'Giriş sırasında bir hata oluştu');
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
              <Text style={styles.title}>Giriş Yap</Text>
              <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>

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
                    testID="login-email"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={[styles.inputAccent, { backgroundColor: ORANGE }]} />
                  <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Şifre"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    testID="login-password"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    {showPassword ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, isLoggingIn && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoggingIn}
                activeOpacity={0.85}
                testID="login-submit"
              >
                {isLoggingIn ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <LogIn size={20} color={Colors.white} />
                    <Text style={styles.loginButtonText}>Giriş Yap</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.replace('/register')} style={styles.registerLink} testID="go-to-register">
                <Text style={styles.registerLinkText}>
                  Hesabın yok mu?{' '}
                  <Text style={styles.registerLinkBold}>Üye Ol</Text>
                </Text>
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  appName: { fontSize: 22, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: 0.3 },
  appTagline: { fontSize: 13, fontWeight: '500' as const, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 26,
    shadowColor: '#1A1D2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  accentBar: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 18 },
  accentDot: { width: 28, height: 4, borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: '500' as const },
  inputGroup: { gap: 12, marginBottom: 22 },
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
  loginButton: {
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
  loginButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' as const },
  registerLink: { marginTop: 20, alignItems: 'center' },
  registerLinkText: { fontSize: 14, color: Colors.textSecondary },
  registerLinkBold: { color: '#1A1D2E', fontWeight: '700' as const },
});
