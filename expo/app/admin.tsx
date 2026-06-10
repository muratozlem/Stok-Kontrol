import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Trash2,
  Mail,
  Check,
  X,
  Users,
  Clock,
  Crown,
  UserCheck,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth, AppUser } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { hashPassword } from '@/utils/hashPassword';

interface ProfileRow {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface ResetRequest {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

async function fetchProfiles(): Promise<ProfileRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, username, role, status, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.log('[Admin] fetchProfiles error:', error.message);
    return [];
  }
  return (data ?? []) as ProfileRow[];
}

async function fetchResetRequests(): Promise<ResetRequest[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    console.log('[Admin] fetchResetRequests error:', error.message);
    return [];
  }
  return (data ?? []) as ResetRequest[];
}

export default function AdminScreen() {
  const { currentUser, isAdmin } = useAuth();
  const { clearAllData } = useData();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'users' | 'reset'>('pending');

  const profilesQuery = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: fetchProfiles,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const resetRequestsQuery = useQuery({
    queryKey: ['admin-reset-requests'],
    queryFn: fetchResetRequests,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const profiles = profilesQuery.data ?? [];
  const pending = profiles.filter((p) => p.status === 'pending');
  const others = profiles.filter((p) => p.status !== 'pending');
  const resetRequests = resetRequestsQuery.data ?? [];

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    },
  });

  const approveResetMutation = useMutation({
    mutationFn: async ({ request, newPass }: { request: ResetRequest; newPass: string }) => {
      const ph = hashPassword(newPass);
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ password_hash: ph })
        .ilike('email', request.email);
      if (pErr) throw pErr;
      const { error: rErr } = await supabase
        .from('password_reset_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);
      if (rErr) throw rErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reset-requests'] });
    },
  });

  const rejectResetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('password_reset_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reset-requests'] });
    },
  });

  const handleApprove = useCallback((user: ProfileRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateStatusMutation.mutate({ id: user.id, status: 'approved' });
  }, [updateStatusMutation]);

  const handleReject = useCallback((user: ProfileRow) => {
    Alert.alert(
      'Talebi Reddet',
      `${user.email} adresinin üyelik talebi reddedilecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            updateStatusMutation.mutate({ id: user.id, status: 'rejected' });
          },
        },
      ]
    );
  }, [updateStatusMutation]);

  const handleDeleteUser = useCallback((user: ProfileRow) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Uyarı', 'Kendi hesabınızı silemezsiniz.');
      return;
    }
    Alert.alert(
      'Kullanıcıyı Sil',
      `${user.email} adresine ait hesap kalıcı olarak silinecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteUserMutation.mutate(user.id);
          },
        },
      ]
    );
  }, [deleteUserMutation, currentUser?.id]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'TÜM VERİLERİ SİL',
      'Tüm ürünler, depolar, stok ve işlem kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Hepsini Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await clearAllData();
              Alert.alert('Tamamlandı', 'Tüm veriler silindi.');
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Bilinmeyen hata';
              Alert.alert('Hata', msg);
            }
          },
        },
      ]
    );
  }, [clearAllData]);

  const handleRejectReset = useCallback((req: ResetRequest) => {
    Alert.alert(
      'Talebi Reddet',
      `${req.email} adresinin şifre sıfırlama talebi reddedilecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            rejectResetMutation.mutate(req.id);
          },
        },
      ]
    );
  }, [rejectResetMutation]);

  const isRefreshing =
    (tab === 'pending' || tab === 'users') ? profilesQuery.isFetching :
    resetRequestsQuery.isFetching;

  const handleRefresh = () => {
    if (tab === 'pending' || tab === 'users') profilesQuery.refetch();
    else resetRequestsQuery.refetch();
  };

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen options={{ title: 'Admin Paneli' }} />
        <View style={styles.deniedContainer}>
          <AlertTriangle size={48} color={Colors.danger} />
          <Text style={styles.deniedTitle}>Yetkisiz Erişim</Text>
          <Text style={styles.deniedText}>Bu sayfaya yalnızca yöneticiler erişebilir.</Text>
          <TouchableOpacity style={styles.deniedBtn} onPress={() => router.back()}>
            <Text style={styles.deniedBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Admin Paneli' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <ShieldCheck size={22} color={Colors.white} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Yönetim Konsolu</Text>
            <Text style={styles.headerSubtitle}>
              Üyelik talepleri ve veri yönetimi
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.warningLight }]}>
              <Clock size={16} color={Colors.warning} strokeWidth={2.4} />
            </View>
            <Text style={styles.statValue}>{pending.length}</Text>
            <Text style={styles.statLabel}>Bekleyen</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.successLight }]}>
              <UserCheck size={16} color={Colors.success} strokeWidth={2.4} />
            </View>
            <Text style={styles.statValue}>
              {profiles.filter((p) => p.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>Onaylı</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF3E0' }]}>
              <KeyRound size={16} color="#F07D28" strokeWidth={2.4} />
            </View>
            <Text style={styles.statValue}>{resetRequests.length}</Text>
            <Text style={styles.statLabel}>Şifre Talebi</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.primaryVeryLight }]}>
              <Users size={16} color={Colors.primary} strokeWidth={2.4} />
            </View>
            <Text style={styles.statValue}>{profiles.length}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'pending' && styles.tabActive]}
            onPress={() => setTab('pending')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
              Üyelik {pending.length > 0 ? `(${pending.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'reset' && styles.tabActiveOrange]}
            onPress={() => setTab('reset')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'reset' && styles.tabTextActiveOrange]}>
              Şifre {resetRequests.length > 0 ? `(${resetRequests.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'users' && styles.tabActive]}
            onPress={() => setTab('users')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>
              Kullanıcılar ({others.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'pending' && (
          profilesQuery.isLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} /></View>
          ) : pending.length === 0 ? (
            <View style={styles.emptyBox}>
              <Clock size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Bekleyen talep yok</Text>
              <Text style={styles.emptyText}>Yeni üyelik talepleri burada görünecek.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {pending.map((u) => (
                <PendingCard
                  key={u.id}
                  user={u}
                  onApprove={() => handleApprove(u)}
                  onReject={() => handleReject(u)}
                  loading={updateStatusMutation.isPending}
                />
              ))}
            </View>
          )
        )}

        {tab === 'reset' && (
          resetRequestsQuery.isLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color="#F07D28" /></View>
          ) : resetRequests.length === 0 ? (
            <View style={styles.emptyBox}>
              <KeyRound size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Bekleyen şifre talebi yok</Text>
              <Text style={styles.emptyText}>Kullanıcıların şifre sıfırlama talepleri burada görünecek.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {resetRequests.map((req) => (
                <ResetRequestCard
                  key={req.id}
                  request={req}
                  onApprove={(newPass) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    approveResetMutation.mutate({ request: req, newPass });
                  }}
                  onReject={() => handleRejectReset(req)}
                  loading={approveResetMutation.isPending || rejectResetMutation.isPending}
                />
              ))}
            </View>
          )
        )}

        {tab === 'users' && (
          profilesQuery.isLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} /></View>
          ) : others.length === 0 ? (
            <View style={styles.emptyBox}>
              <Users size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Henüz kullanıcı yok</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {others.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUser?.id}
                  onDelete={() => handleDeleteUser(u)}
                />
              ))}
            </View>
          )
        )}

        <Text style={styles.sectionLabel}>TEHLİKELİ BÖLGE</Text>
        <View style={[styles.card, styles.cardDanger]}>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleClearAll}
            activeOpacity={0.7}
            testID="admin-clear-all-btn"
          >
            <View style={styles.dangerIconWrap}>
              <Trash2 size={18} color={Colors.danger} strokeWidth={2.3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerTitle}>Tüm Verileri Sil</Text>
              <Text style={styles.dangerSubtitle}>
                Ürünler, depolar, stok ve işlem kayıtları silinir. Geri alınamaz.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

function ResetRequestCard({
  request,
  onApprove,
  onReject,
  loading,
}: {
  request: ResetRequest;
  onApprove: (newPassword: string) => void;
  onReject: () => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');

  const date = new Date(request.created_at).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const handleApprovePress = () => {
    setPassError('');
    if (!newPassword || newPassword.length < 6) {
      setPassError('Şifre en az 6 karakter olmalı');
      return;
    }
    onApprove(newPassword);
    setNewPassword('');
    setExpanded(false);
  };

  return (
    <View style={styles.userCard}>
      <View style={styles.userTop}>
        <View style={[styles.avatar, { backgroundColor: '#FFF3E0' }]}>
          <KeyRound size={18} color="#F07D28" strokeWidth={2.3} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userEmail} numberOfLines={1}>{request.email}</Text>
          <Text style={styles.userMeta}>Talep: {date}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.resetForm}>
          <Text style={styles.resetFormLabel}>Kullanıcı için yeni şifre belirleyin:</Text>
          <View style={styles.resetInputWrapper}>
            <TextInput
              style={styles.resetInput}
              placeholder="Yeni şifre (en az 6 karakter)"
              placeholderTextColor={Colors.textMuted}
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setPassError(''); }}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              {showPass ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
            </TouchableOpacity>
          </View>
          {passError ? <Text style={styles.passError}>{passError}</Text> : null}
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={onReject}
          disabled={loading}
          activeOpacity={0.8}
        >
          <X size={16} color={Colors.danger} strokeWidth={2.6} />
          <Text style={styles.rejectBtnText}>Reddet</Text>
        </TouchableOpacity>

        {!expanded ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.setPassBtn]}
            onPress={() => setExpanded(true)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <KeyRound size={16} color={Colors.white} strokeWidth={2.6} />
            <Text style={styles.approveBtnText}>Şifre Belirle</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn, loading && { opacity: 0.7 }]}
            onPress={handleApprovePress}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Check size={16} color={Colors.white} strokeWidth={2.8} />
                <Text style={styles.approveBtnText}>Onayla</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PendingCard({
  user,
  onApprove,
  onReject,
  loading,
}: {
  user: AppUser | ProfileRow;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  const u = user as ProfileRow;
  const date = new Date(u.created_at).toLocaleDateString('tr-TR');
  return (
    <View style={styles.userCard}>
      <View style={styles.userTop}>
        <View style={styles.avatar}>
          <Mail size={18} color={Colors.primary} strokeWidth={2.3} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
          <Text style={styles.userMeta}>Talep tarihi: {date}</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={onReject}
          disabled={loading}
          activeOpacity={0.8}
        >
          <X size={16} color={Colors.danger} strokeWidth={2.6} />
          <Text style={styles.rejectBtnText}>Reddet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={onApprove}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Check size={16} color={Colors.white} strokeWidth={2.8} />
          <Text style={styles.approveBtnText}>Onayla</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function UserCard({
  user,
  isSelf,
  onDelete,
}: {
  user: ProfileRow;
  isSelf: boolean;
  onDelete: () => void;
}) {
  const date = new Date(user.created_at).toLocaleDateString('tr-TR');
  const isAdminUser = user.role === 'admin';
  const isRejected = user.status === 'rejected';
  return (
    <View style={styles.userCard}>
      <View style={styles.userTop}>
        <View style={[styles.avatar, isAdminUser && styles.avatarAdmin]}>
          {isAdminUser ? (
            <Crown size={18} color={Colors.primary} strokeWidth={2.3} />
          ) : (
            <Mail size={18} color={Colors.primary} strokeWidth={2.3} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.userNameRow}>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
            {isSelf && <Text style={styles.selfBadge}>Siz</Text>}
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isAdminUser ? styles.badgeAdmin : styles.badgeUser]}>
              <Text style={[styles.badgeText, isAdminUser ? styles.badgeTextAdmin : styles.badgeTextUser]}>
                {isAdminUser ? 'Yönetici' : 'Kullanıcı'}
              </Text>
            </View>
            <View style={[styles.badge, isRejected ? styles.badgeRejected : styles.badgeApproved]}>
              <Text style={[styles.badgeText, isRejected ? styles.badgeTextRejected : styles.badgeTextApproved]}>
                {isRejected ? 'Reddedildi' : 'Onaylı'}
              </Text>
            </View>
          </View>
          <Text style={styles.userMeta}>Üyelik: {date}</Text>
        </View>
      </View>
      {!isSelf && (
        <TouchableOpacity style={styles.deleteUserBtn} onPress={onDelete} activeOpacity={0.8}>
          <Trash2 size={14} color={Colors.danger} strokeWidth={2.4} />
          <Text style={styles.deleteUserText}>Hesabı Sil</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 30 },
  deniedContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  deniedTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.text, marginTop: 6 },
  deniedText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  deniedBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deniedBtnText: { color: Colors.white, fontWeight: '700' as const },
  headerCard: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800' as const, color: Colors.white },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 17, fontWeight: '800' as const, color: Colors.text },
  statLabel: { fontSize: 9.5, color: Colors.textSecondary, fontWeight: '600' as const, marginTop: 2, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabActiveOrange: { backgroundColor: '#F07D28' },
  tabText: { fontSize: 11.5, fontWeight: '700' as const, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  tabTextActiveOrange: { color: Colors.white },
  list: { gap: 10 },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAdmin: { backgroundColor: Colors.primarySoft },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  userEmail: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, flexShrink: 1 },
  selfBadge: {
    fontSize: 9.5,
    fontWeight: '800' as const,
    color: Colors.primary,
    backgroundColor: Colors.primaryVeryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  badgeAdmin: { backgroundColor: Colors.primarySoft },
  badgeUser: { backgroundColor: Colors.surfaceSoft },
  badgeApproved: { backgroundColor: Colors.successLight },
  badgeRejected: { backgroundColor: Colors.dangerLight },
  badgeText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.3 },
  badgeTextAdmin: { color: Colors.primaryDark },
  badgeTextUser: { color: Colors.textSecondary },
  badgeTextApproved: { color: Colors.success },
  badgeTextRejected: { color: Colors.danger },
  userMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 11,
  },
  approveBtn: { backgroundColor: Colors.success },
  setPassBtn: { backgroundColor: '#F07D28' },
  approveBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' as const },
  rejectBtn: { backgroundColor: Colors.dangerLight, borderWidth: 1, borderColor: Colors.dangerLight },
  rejectBtnText: { color: Colors.danger, fontSize: 13, fontWeight: '700' as const },
  deleteUserBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.dangerLight,
  },
  deleteUserText: { color: Colors.danger, fontSize: 12, fontWeight: '700' as const },
  loadingBox: { padding: 30, alignItems: 'center' },
  emptyBox: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, marginTop: 6 },
  emptyText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardDanger: { borderColor: Colors.dangerLight },
  dangerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  dangerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.danger },
  dangerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  resetForm: {
    marginTop: 12,
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE0C0',
  },
  resetFormLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8, fontWeight: '600' as const },
  resetInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#F07D28',
    paddingHorizontal: 12,
    height: 44,
  },
  resetInput: { flex: 1, fontSize: 14, color: Colors.text },
  eyeBtn: { padding: 4 },
  passError: { fontSize: 11, color: Colors.danger, marginTop: 6, fontWeight: '500' as const },
});
