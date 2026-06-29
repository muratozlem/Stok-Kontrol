import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
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
  MapPin,
  Plus,
  UserCog,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import type { UserRole, Location } from '@/types';

type TabType = 'locations' | 'pending' | 'users' | 'danger';

interface ProfileRow {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  location_id: string | null;
  created_at: string;
}


const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Süper Admin',
  admin: 'İdari İşler',
  chef: 'Şef',
  staff: 'Personel',
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  super_admin: { bg: '#EEE8F8', text: '#7B2FBE' },
  admin: { bg: Colors.primaryVeryLight, text: Colors.primary },
  chef: { bg: Colors.infoLight, text: Colors.info },
  staff: { bg: Colors.successLight, text: Colors.success },
};

function RoleBadge({ role }: { role: UserRole }) {
  const c = ROLE_COLORS[role] ?? { bg: '#F0F0F0', text: '#666' };
  return (
    <View style={[sBadge.wrap, { backgroundColor: c.bg }]}>
      <Text style={[sBadge.text, { color: c.text }]}>{ROLE_LABELS[role] ?? role}</Text>
    </View>
  );
}

const sBadge = StyleSheet.create({
  wrap: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  text: { fontSize: 11, fontWeight: '700' as const },
});

async function fetchAllProfiles(): Promise<ProfileRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, username, role, status, location_id, created_at')
    .order('created_at', { ascending: false });
  if (error) { console.log('[Admin] fetchProfiles error:', error.message); return []; }
  return (data ?? []) as ProfileRow[];
}


export default function AdminScreen() {
  const { currentUser, isSuperAdmin, isAdmin, canManageUsers } = useAuth();
  const { clearAllData, locations, addLocation, deleteLocation } = useData();
  const queryClient = useQueryClient();

  const defaultTab: TabType = isSuperAdmin ? 'locations' : isAdmin ? 'pending' : 'users';
  const [tab, setTab] = useState<TabType>(defaultTab);

  const profilesQuery = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: fetchAllProfiles,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const allProfiles: ProfileRow[] = profilesQuery.data ?? [];

  const pendingUsers = useMemo(() => allProfiles.filter(p => p.status === 'pending'), [allProfiles]);

  const activeUsers = useMemo(() => {
    const approved = allProfiles.filter(p => p.status !== 'pending');
    if (isSuperAdmin) return approved;
    const myLoc = currentUser?.locationId;
    if (!myLoc) return approved;
    return approved.filter(p => p.location_id === myLoc);
  }, [allProfiles, isSuperAdmin, currentUser]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-profiles'] }); },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ targetUserId, newRole, newLocationId, newStatus }: {
      targetUserId: string; newRole: UserRole; newLocationId?: string | null; newStatus?: string;
    }) => {
      const body: Record<string, unknown> = { targetUserId, newRole };
      if (newLocationId !== undefined) body.newLocationId = newLocationId;
      if (newStatus) body.newStatus = newStatus;
      const { data, error } = await supabase.functions.invoke('update-user-role', { body });
      if (error) throw new Error(error.message ?? 'Rol güncellenemedi');
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-profiles'] }); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { targetUserId: id } });
      if (error) throw new Error(error.message ?? 'Kullanıcı silinemedi');
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-profiles'] }); },
  });

  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearAllLoading, setClearAllLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleClearAllConfirm = useCallback(async () => {
    try {
      setClearAllLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await clearAllData();
    } catch (e) {
      console.log('[Admin] Clear all error:', e instanceof Error ? e.message : e);
    } finally {
      setClearAllLoading(false);
      setConfirmClearAll(false);
    }
  }, [clearAllData]);

  const isRefreshing = (tab === 'pending' || tab === 'users') ? profilesQuery.isFetching : false;

  const handleRefresh = () => {
    if (tab === 'pending' || tab === 'users') profilesQuery.refetch();
  };

  if (!canManageUsers) {
    return (
      <>
        <Stack.Screen options={{ title: 'Yönetim Paneli' }} />
        <View style={styles.deniedContainer}>
          <AlertTriangle size={48} color={Colors.danger} />
          <Text style={styles.deniedTitle}>Yetkisiz Erişim</Text>
          <Text style={styles.deniedText}>Bu sayfaya erişim yetkiniz yok.</Text>
          <TouchableOpacity style={styles.deniedBtn} onPress={() => router.back()}>
            <Text style={styles.deniedBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const tabs: TabType[] = isSuperAdmin
    ? ['locations', 'pending', 'users', 'danger']
    : ['pending', 'users'];

  const tabLabels: Record<TabType, string> = {
    locations: 'Lokasyonlar',
    pending: `Üyelik${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}`,
    users: 'Kullanıcılar',
    danger: 'Tehlike',
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Yönetim Paneli' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <ShieldCheck size={22} color={Colors.white} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Yönetim Konsolu</Text>
            <Text style={styles.headerSubtitle}>
              {isSuperAdmin ? 'Tüm Türkiye — Sınırsız Erişim' : 'İdari İşler — Kendi Lokasyonu'}
            </Text>
          </View>
          <RoleBadge role={currentUser?.role ?? 'staff'} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.warningLight }]}>
              <Clock size={16} color={Colors.warning} strokeWidth={2.4} />
            </View>
            <Text style={styles.statValue}>{pendingUsers.length}</Text>
            <Text style={styles.statLabel}>Bekleyen</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.successLight }]}>
              <UserCheck size={16} color={Colors.success} strokeWidth={2.4} />
            </View>
            <Text style={styles.statValue}>{activeUsers.length}</Text>
            <Text style={styles.statLabel}>Aktif</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.primaryVeryLight }]}>
              <MapPin size={16} color={Colors.primary} strokeWidth={2.4} />
            </View>
            <Text style={styles.statValue}>{locations.length}</Text>
            <Text style={styles.statLabel}>Lokasyon</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabs}>
            {tabs.map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tab,
                  tab === t && (t === 'danger' ? styles.tabActiveDanger : styles.tabActive),
                ]}
                onPress={() => setTab(t)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText,
                  tab === t && (t === 'danger' ? styles.tabTextActiveDanger : styles.tabTextActive),
                ]}>
                  {tabLabels[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {tab === 'locations' && isSuperAdmin && (
          <LocationsTab
            locations={locations}
            onAdd={addLocation}
            onDelete={deleteLocation}
          />
        )}

        {tab === 'pending' && (
          profilesQuery.isLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} /></View>
          ) : pendingUsers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Clock size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Bekleyen talep yok</Text>
              <Text style={styles.emptyText}>Yeni üyelik talepleri burada görünecek.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {pendingUsers.map((u) => (
                <PendingCard
                  key={u.id}
                  user={u}
                  locations={locations}
                  callerRole={currentUser?.role ?? 'staff'}
                  callerLocationId={currentUser?.locationId ?? null}
                  onApprove={(role, locationId) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    updateRoleMutation.mutate({
                      targetUserId: u.id,
                      newRole: role,
                      newLocationId: locationId,
                      newStatus: 'approved',
                    });
                  }}
                  onReject={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    updateStatusMutation.mutate({ id: u.id, status: 'rejected' });
                  }}
                  loading={updateRoleMutation.isPending || updateStatusMutation.isPending}
                />
              ))}
            </View>
          )
        )}

        {tab === 'users' && (
          profilesQuery.isLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} /></View>
          ) : activeUsers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Users size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Henüz kullanıcı yok</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {activeUsers.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUser?.id}
                  locations={locations}
                  callerRole={currentUser?.role ?? 'staff'}
                  callerLocationId={currentUser?.locationId ?? null}
                  confirmingDelete={confirmDeleteId === u.id}
                  onRoleChange={(newRole, newLocationId) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    updateRoleMutation.mutate({ targetUserId: u.id, newRole, newLocationId });
                  }}
                  onDelete={() => setConfirmDeleteId(u.id)}
                  onConfirmDelete={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setConfirmDeleteId(null);
                    deleteUserMutation.mutate(u.id);
                  }}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  loading={updateRoleMutation.isPending || (deleteUserMutation.isPending && confirmDeleteId === u.id)}
                />
              ))}
            </View>
          )
        )}

        {tab === 'danger' && isSuperAdmin && (
          <>
            <Text style={styles.sectionLabel}>TEHLİKELİ BÖLGE</Text>
            <View style={[styles.card, styles.cardDanger]}>
              {!confirmClearAll ? (
                <TouchableOpacity
                  style={styles.dangerRow}
                  onPress={() => setConfirmClearAll(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dangerIconWrap}>
                    <Trash2 size={18} color={Colors.danger} strokeWidth={2.3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dangerTitle}>Tüm Verileri Sil</Text>
                    <Text style={styles.dangerSubtitle}>Ürünler, depolar, stok ve işlem kayıtları silinir. Geri alınamaz.</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={{ padding: 4 }}>
                  <Text style={styles.dangerTitle}>Tüm veriler kalıcı olarak silinecek!</Text>
                  <Text style={[styles.dangerSubtitle, { marginBottom: 12 }]}>Bu işlem geri alınamaz. Emin misiniz?</Text>
                  <View style={styles.confirmRow}>
                    <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmClearAll(false)} activeOpacity={0.8}>
                      <Text style={styles.confirmCancelText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmDeleteBtn, clearAllLoading && { opacity: 0.7 }]}
                      onPress={handleClearAllConfirm}
                      disabled={clearAllLoading}
                      activeOpacity={0.8}
                    >
                      {clearAllLoading ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Trash2 size={14} color={Colors.white} strokeWidth={2.4} />
                          <Text style={styles.confirmDeleteText}>Evet, Sil</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

function LocationsTab({
  locations,
  onAdd,
  onDelete,
}: {
  locations: Location[];
  onAdd: (loc: Omit<Location, 'id' | 'createdAt'>) => Promise<Location>;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) { setError('Lokasyon adı zorunlu'); return; }
    setLoading(true);
    setError('');
    try {
      await onAdd({ name: name.trim(), city: city.trim(), description: description.trim() });
      setName(''); setCity(''); setDescription('');
      setShowForm(false);
    } catch (e) {
      setError((e as Error).message ?? 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>Lokasyonlar ({locations.length})</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowForm(!showForm)}
          activeOpacity={0.8}
        >
          <Plus size={15} color={Colors.white} strokeWidth={2.4} />
          <Text style={styles.addBtnText}>Yeni Lokasyon</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Lokasyon Adı *</Text>
          <TextInput
            style={styles.formInput}
            value={name}
            onChangeText={setName}
            placeholder="örn. İstanbul Ofisi"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.formLabel}>Şehir</Text>
          <TextInput
            style={styles.formInput}
            value={city}
            onChangeText={setCity}
            placeholder="örn. İstanbul"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.formLabel}>Açıklama</Text>
          <TextInput
            style={styles.formInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Kısa açıklama"
            placeholderTextColor={Colors.textMuted}
          />
          {error ? <Text style={styles.formError}>{error}</Text> : null}
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowForm(false)} activeOpacity={0.8}>
              <Text style={styles.formCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formSaveBtn, loading && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.formSaveText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {locations.length === 0 ? (
        <View style={styles.emptyBox}>
          <MapPin size={32} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Henüz lokasyon yok</Text>
          <Text style={styles.emptyText}>Kullanıcı atamak için önce lokasyon oluşturun.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {locations.map(loc => (
            <View key={loc.id} style={styles.locationCard}>
              <View style={[styles.locIconWrap]}>
                <MapPin size={18} color={Colors.primary} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locName}>{loc.name}</Text>
                {loc.city ? <Text style={styles.locCity}>{loc.city}</Text> : null}
              </View>
              {confirmDeleteId === loc.id ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.locCancelBtn}
                    onPress={() => setConfirmDeleteId(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.locCancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.locDeleteConfirmBtn}
                    onPress={() => { setConfirmDeleteId(null); onDelete(loc.id); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.locDeleteConfirmText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.locDeleteBtn}
                  onPress={() => setConfirmDeleteId(loc.id)}
                  activeOpacity={0.8}
                >
                  <Trash2 size={15} color={Colors.danger} strokeWidth={2.3} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PendingCard({
  user,
  locations,
  callerRole,
  callerLocationId,
  onApprove,
  onReject,
  loading,
}: {
  user: ProfileRow;
  locations: Location[];
  callerRole: UserRole;
  callerLocationId: string | null;
  onApprove: (role: UserRole, locationId: string | null) => void;
  onReject: () => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [selectedLocId, setSelectedLocId] = useState<string>(callerLocationId ?? '');
  const [confirmReject, setConfirmReject] = useState(false);

  const availableRoles: UserRole[] = callerRole === 'super_admin'
    ? ['super_admin', 'admin', 'chef', 'staff']
    : ['chef', 'staff'];

  const availableLocs = callerRole === 'super_admin' ? locations : locations.filter(l => l.id === callerLocationId);

  const date = new Date(user.created_at).toLocaleDateString('tr-TR');

  return (
    <View style={styles.userCard}>
      <View style={styles.userTop}>
        <View style={styles.avatar}>
          <Mail size={18} color={Colors.primary} strokeWidth={2.3} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          <Text style={styles.userMeta}>Talep: {date}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.approveForm}>
          <Text style={styles.approveFormLabel}>Rol seçin:</Text>
          <View style={styles.rolePickerRow}>
            {availableRoles.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, selectedRole === r && styles.roleChipActive]}
                onPress={() => setSelectedRole(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleChipText, selectedRole === r && styles.roleChipTextActive]}>
                  {ROLE_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedRole !== 'super_admin' && (
            <>
              <Text style={[styles.approveFormLabel, { marginTop: 10 }]}>Lokasyon seçin:</Text>
              <View style={styles.rolePickerRow}>
                {availableLocs.length === 0 ? (
                  <Text style={styles.noLocText}>Önce lokasyon oluşturun</Text>
                ) : availableLocs.map(l => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.roleChip, selectedLocId === l.id && styles.roleChipActive]}
                    onPress={() => setSelectedLocId(l.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleChipText, selectedLocId === l.id && styles.roleChipTextActive]}>
                      {l.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {confirmReject ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>Bu üyelik talebini reddetmek istediğinize emin misiniz?</Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmReject(false)} activeOpacity={0.8}>
              <Text style={styles.confirmCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmDeleteBtn, loading && { opacity: 0.7 }]}
              onPress={() => { setConfirmReject(false); onReject(); }}
              disabled={loading}
              activeOpacity={0.8}
            >
              <X size={14} color={Colors.white} strokeWidth={2.4} />
              <Text style={styles.confirmDeleteText}>Reddet</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => setConfirmReject(true)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <X size={16} color={Colors.danger} strokeWidth={2.6} />
            <Text style={styles.rejectBtnText}>Reddet</Text>
          </TouchableOpacity>

          {!expanded ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => setExpanded(true)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <UserCog size={16} color={Colors.white} strokeWidth={2.6} />
              <Text style={styles.approveBtnText}>Rol Ata & Onayla</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn, loading && { opacity: 0.7 }]}
              onPress={() => {
                const locId = selectedRole === 'super_admin' ? null : (selectedLocId || null);
                onApprove(selectedRole, locId);
                setExpanded(false);
              }}
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
      )}
    </View>
  );
}

function UserCard({
  user,
  isSelf,
  locations,
  callerRole,
  callerLocationId,
  confirmingDelete,
  onRoleChange,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  loading,
}: {
  user: ProfileRow;
  isSelf: boolean;
  locations: Location[];
  callerRole: UserRole;
  callerLocationId: string | null;
  confirmingDelete: boolean;
  onRoleChange: (newRole: UserRole, newLocationId: string | null) => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  loading: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [selectedLocId, setSelectedLocId] = useState<string>(user.location_id ?? '');

  const availableRoles: UserRole[] = callerRole === 'super_admin'
    ? ['super_admin', 'admin', 'chef', 'staff']
    : callerRole === 'admin'
    ? ['chef', 'staff']
    : ['staff'];

  const availableLocs = callerRole === 'super_admin'
    ? locations
    : locations.filter(l => l.id === callerLocationId);

  const userLocation = locations.find(l => l.id === user.location_id);
  const statusColor = user.status === 'approved' ? Colors.success : user.status === 'rejected' ? Colors.danger : Colors.warning;
  const statusLabel = user.status === 'approved' ? 'Onaylı' : user.status === 'rejected' ? 'Reddedildi' : 'Bekliyor';
  const date = new Date(user.created_at).toLocaleDateString('tr-TR');

  const canEdit = !isSelf && (
    callerRole === 'super_admin' ||
    (callerRole === 'admin' && ['chef', 'staff'].includes(user.role))
  );
  const canDelete = callerRole === 'super_admin' && !isSelf;

  return (
    <View style={styles.userCard}>
      <View style={styles.userTop}>
        <View style={[styles.avatar, { backgroundColor: Colors.primaryVeryLight }]}>
          {user.role === 'super_admin' ? (
            <Crown size={18} color={Colors.primary} strokeWidth={2.3} />
          ) : (
            <UserCheck size={18} color={Colors.primary} strokeWidth={2.3} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <RoleBadge role={user.role} />
            {userLocation ? (
              <View style={styles.locTag}>
                <MapPin size={10} color={Colors.textSecondary} strokeWidth={2.3} />
                <Text style={styles.locTagText}>{userLocation.name}</Text>
              </View>
            ) : null}
            <View style={[styles.statusTag, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.userMeta}>{date}{isSelf ? ' · Sen' : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {canEdit && !editing && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditing(true)}
              activeOpacity={0.8}
            >
              <UserCog size={16} color={Colors.primary} strokeWidth={2.3} />
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity
              style={styles.deleteBtnSmall}
              onPress={onDelete}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color={Colors.danger} strokeWidth={2.3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {editing && (
        <View style={styles.approveForm}>
          <Text style={styles.approveFormLabel}>Rol:</Text>
          <View style={styles.rolePickerRow}>
            {availableRoles.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, selectedRole === r && styles.roleChipActive]}
                onPress={() => setSelectedRole(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleChipText, selectedRole === r && styles.roleChipTextActive]}>
                  {ROLE_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedRole !== 'super_admin' && (
            <>
              <Text style={[styles.approveFormLabel, { marginTop: 10 }]}>Lokasyon:</Text>
              <View style={styles.rolePickerRow}>
                {availableLocs.map(l => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.roleChip, selectedLocId === l.id && styles.roleChipActive]}
                    onPress={() => setSelectedLocId(l.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleChipText, selectedLocId === l.id && styles.roleChipTextActive]}>
                      {l.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <View style={[styles.formActions, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.formCancelBtn} onPress={() => setEditing(false)} activeOpacity={0.8}>
              <Text style={styles.formCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formSaveBtn, loading && { opacity: 0.7 }]}
              onPress={() => {
                const locId = selectedRole === 'super_admin' ? null : (selectedLocId || null);
                onRoleChange(selectedRole, locId);
                setEditing(false);
              }}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.formSaveText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {confirmingDelete && (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?</Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={onCancelDelete} activeOpacity={0.8}>
              <Text style={styles.confirmCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmDeleteBtn, loading && { opacity: 0.7 }]}
              onPress={onConfirmDelete}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Trash2 size={14} color={Colors.white} strokeWidth={2.4} />
                  <Text style={styles.confirmDeleteText}>Sil</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  deniedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: Colors.background },
  deniedTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, marginTop: 16 },
  deniedText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  deniedBtn: {
    marginTop: 24, backgroundColor: Colors.primary, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 13,
  },
  deniedBtnText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primary, borderRadius: 18, padding: 16, marginBottom: 14,
  },
  headerIconWrap: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800' as const, color: Colors.white },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight,
  },
  statIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  statLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' as const, marginTop: 1 },
  tabsScroll: { marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 6, paddingVertical: 2, paddingHorizontal: 1 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabActiveDanger: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  tabText: { fontSize: 13, fontWeight: '700' as const, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  tabTextActiveDanger: { color: Colors.white },
  sectionLabel: {
    fontSize: 11, fontWeight: '700' as const, color: Colors.textMuted,
    letterSpacing: 1.2, marginBottom: 8, marginTop: 4, marginLeft: 4,
  },
  list: { gap: 8 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  listHeaderText: { fontSize: 15, fontWeight: '800' as const, color: Colors.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '700' as const, color: Colors.white },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.textSecondary },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  formCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  formLabel: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary, marginBottom: 6, marginTop: 4, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  formInput: {
    backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 4,
  },
  formError: { fontSize: 12, color: Colors.danger, marginTop: 4, marginBottom: 4 },
  formActions: { flexDirection: 'row', gap: 10 },
  formCancelBtn: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight,
  },
  formCancelText: { fontSize: 14, fontWeight: '700' as const, color: Colors.textSecondary },
  formSaveBtn: {
    flex: 1.5, backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  formSaveText: { fontSize: 14, fontWeight: '800' as const, color: Colors.white },
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  locIconWrap: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  locName: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  locCity: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  locDeleteBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF0EF',
    alignItems: 'center', justifyContent: 'center',
  },
  locCancelBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight,
  },
  locCancelText: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary },
  locDeleteConfirmBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9,
    backgroundColor: Colors.danger,
  },
  locDeleteConfirmText: { fontSize: 12, fontWeight: '700' as const, color: Colors.white },
  userCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  userTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  avatar: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  userEmail: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  userMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  locTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  locTagText: { fontSize: 10, fontWeight: '600' as const, color: Colors.textSecondary },
  statusTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusTagText: { fontSize: 10, fontWeight: '700' as const },
  editBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primaryVeryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnSmall: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF0EF',
    alignItems: 'center', justifyContent: 'center',
  },
  approveForm: {
    backgroundColor: Colors.background, borderRadius: 12, padding: 12, marginTop: 10,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  approveFormLabel: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  rolePickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight,
  },
  roleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleChipText: { fontSize: 13, fontWeight: '700' as const, color: Colors.text },
  roleChipTextActive: { color: Colors.white },
  noLocText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' as const },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  rejectBtn: { backgroundColor: '#FFF0EF', borderWidth: 1, borderColor: '#FCCDC9' },
  rejectBtnText: { fontSize: 13, fontWeight: '700' as const, color: Colors.danger },
  approveBtn: { backgroundColor: Colors.primary },
  approveBtnText: { fontSize: 13, fontWeight: '700' as const, color: Colors.white },
  confirmBox: {
    backgroundColor: '#FFF8F0', borderRadius: 12, padding: 12, marginTop: 10,
    borderWidth: 1, borderColor: '#FFE0B2',
  },
  confirmText: { fontSize: 13, color: Colors.text, marginBottom: 12, fontWeight: '600' as const },
  confirmRow: { flexDirection: 'row', gap: 8 },
  confirmCancelBtn: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight,
  },
  confirmCancelText: { fontSize: 13, fontWeight: '700' as const, color: Colors.textSecondary },
  confirmDeleteBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.danger, borderRadius: 10, paddingVertical: 10, gap: 6,
  },
  confirmDeleteText: { fontSize: 13, fontWeight: '700' as const, color: Colors.white },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardDanger: { borderColor: '#FCCDC9' },
  dangerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  dangerIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF0EF',
    alignItems: 'center', justifyContent: 'center',
  },
  dangerTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  dangerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
});
