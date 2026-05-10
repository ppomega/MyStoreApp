import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  createTenant,
  deleteTenant,
  getTenants,
  Tenant,
  TenantInput,
  updateTenant,
} from '../services/tenantsApi';
import { useAppTheme } from '../theme/ThemeContext';

type TenantForm = Omit<TenantInput, 'rent' | 'advance'> & {
  rent: string;
  advance: string;
};

const emptyForm: TenantForm = {
  name: '',
  phone: '',
  room: '',
  rent: '',
  advance: '',
  status: 'Active',
  notes: '',
};

const statusOptions = ['Active', 'Pending', 'Left'];

function formToPayload(form: TenantForm): TenantInput {
  return {
    ...form,
    name: form.name.trim(),
    phone: form.phone.trim(),
    room: form.room.trim(),
    rent: Number(form.rent) || 0,
    advance: Number(form.advance) || 0,
    notes: form.notes.trim(),
  };
}

function tenantToForm(tenant: Tenant): TenantForm {
  return {
    name: tenant.name,
    phone: tenant.phone,
    room: tenant.room,
    rent: tenant.rent ? String(tenant.rent) : '',
    advance: tenant.advance ? String(tenant.advance) : '',
    status: tenant.status || 'Active',
    notes: tenant.notes,
  };
}

export default function Tenants() {
  const { colors } = useAppTheme();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [pendingDeleteTenant, setPendingDeleteTenant] = useState<Tenant | null>(
    null,
  );
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [successMessage, setSuccessMessage] = useState('');

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError('');
      const items = await getTenants();
      setTenants(items);
    } catch {
      setError('Could not load tenants from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const filteredTenants = tenants.filter(tenant =>
    [tenant.name, tenant.phone, tenant.room, tenant.status]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const openCreateModal = () => {
    setEditingTenant(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setForm(tenantToForm(tenant));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing name', 'Please enter tenant name.');
      return;
    }

    try {
      setSaving(true);
      const payload = formToPayload(form);

      if (editingTenant) {
        const updatedTenant = await updateTenant(editingTenant.id, payload);
        setTenants(prev =>
          prev.map(tenant =>
            tenant.id === editingTenant.id ? updatedTenant : tenant,
          ),
        );
        setSuccessMessage('Tenant updated.');
      } else {
        const createdTenant = await createTenant(payload);
        setTenants(prev => [createdTenant, ...prev]);
        setSuccessMessage('Tenant added.');
      }

      setModalVisible(false);
      setEditingTenant(null);
      setForm(emptyForm);
    } catch {
      Alert.alert('Save failed', 'Could not save the tenant.');
    } finally {
      setSaving(false);
    }
  };

  const removeTenant = async (tenant: Tenant) => {
    try {
      await deleteTenant(tenant.id);
      setTenants(prev => prev.filter(item => item.id !== tenant.id));
      setPendingDeleteTenant(null);
      setSuccessMessage('Tenant deleted.');
    } catch {
      Alert.alert('Delete failed', 'Could not delete the tenant.');
    }
  };

  const renderTenant = ({ item }: { item: Tenant }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.name || 'Tenant'}
          </Text>
          <Text
            style={[styles.meta, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {[item.room ? `Room ${item.room}` : '', item.phone]
              .filter(Boolean)
              .join(' - ')}
          </Text>
        </View>
        <Text
          style={[
            styles.statusPill,
            {
              backgroundColor:
                item.status.toLowerCase() === 'active'
                  ? colors.success
                  : colors.surfaceMuted,
              color:
                item.status.toLowerCase() === 'active' ? '#fff' : colors.text,
            },
          ]}
        >
          {item.status || 'Active'}
        </Text>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>Rent</Text>
          <Text style={styles.amount}>Rs {item.rent}</Text>
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            Advance
          </Text>
          <Text style={styles.amount}>Rs {item.advance}</Text>
        </View>
      </View>

      {item.notes ? (
        <Text
          style={[styles.notes, { color: colors.textMuted }]}
          numberOfLines={2}
        >
          {item.notes}
        </Text>
      ) : null}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => setPendingDeleteTenant(item)}
        >
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View>
        <Icon name="search" size={16} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search tenants"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={[
            styles.search,
            { backgroundColor: colors.input, color: colors.text },
          ]}
        />
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
        <Text style={styles.addText}>+ Add Tenant</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#fcc01e" style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadTenants}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTenants}
          keyExtractor={item => item.id}
          renderItem={renderTenant}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No tenants found.
            </Text>
          }
        />
      )}

      {successMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{successMessage}</Text>
          <TouchableOpacity onPress={() => setSuccessMessage('')}>
            <Text style={styles.toastDismiss}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
        >
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {editingTenant ? 'Edit Tenant' : 'Add Tenant'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                placeholder="Name"
                placeholderTextColor="#999"
                value={form.name}
                onChangeText={text =>
                  setForm(prev => ({ ...prev, name: text }))
                }
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
              <TextInput
                placeholder="Phone"
                placeholderTextColor="#999"
                value={form.phone}
                onChangeText={text =>
                  setForm(prev => ({ ...prev, phone: text }))
                }
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
              <TextInput
                placeholder="Room"
                placeholderTextColor="#999"
                value={form.room}
                onChangeText={text =>
                  setForm(prev => ({ ...prev, room: text }))
                }
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
              <View style={styles.formRow}>
                <TextInput
                  placeholder="Rent"
                  placeholderTextColor="#999"
                  value={form.rent}
                  onChangeText={text =>
                    setForm(prev => ({ ...prev, rent: text }))
                  }
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    styles.halfInput,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
                <TextInput
                  placeholder="Advance"
                  placeholderTextColor="#999"
                  value={form.advance}
                  onChangeText={text =>
                    setForm(prev => ({ ...prev, advance: text }))
                  }
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    styles.halfInput,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>
              <View style={styles.statusRow}>
                {statusOptions.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusBtn,
                      {
                        backgroundColor:
                          form.status === status
                            ? colors.navActive
                            : colors.surfaceMuted,
                      },
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, status }))}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        {
                          color:
                            form.status === status &&
                            colors.navActive === colors.accent
                              ? '#000'
                              : form.status === status
                              ? colors.accent
                              : colors.text,
                        },
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                placeholder="Notes"
                placeholderTextColor="#999"
                value={form.notes}
                onChangeText={text =>
                  setForm(prev => ({ ...prev, notes: text }))
                }
                multiline
                style={[
                  styles.input,
                  styles.notesInput,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.saveText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(pendingDeleteTenant)}
        animationType="fade"
        transparent
      >
        <View
          style={[styles.confirmOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[styles.confirmBox, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              Delete tenant?
            </Text>
            <Text style={[styles.confirmText, { color: colors.textMuted }]}>
              This will permanently delete "{pendingDeleteTenant?.name}".
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.cancelDeleteBtn, { borderColor: colors.border }]}
                onPress={() => setPendingDeleteTenant(null)}
              >
                <Text style={[styles.cancelDeleteText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() =>
                  pendingDeleteTenant ? removeTenant(pendingDeleteTenant) : null
                }
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  searchIcon: { left: 10, position: 'absolute', top: 12, zIndex: 1 },
  search: {
    borderRadius: 10,
    fontFamily: 'JetBrains',
    height: 45,
    marginBottom: 10,
    paddingHorizontal: 30,
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: '#fcc01e',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
  },
  addText: { color: '#000', fontFamily: 'JetBrains', fontWeight: '400' },
  listContent: { paddingBottom: 130 },
  card: { borderRadius: 12, marginBottom: 12, padding: 14 },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  cardTitleWrap: { flex: 1 },
  name: { fontFamily: 'JetBrains', fontSize: 16, fontWeight: '400' },
  meta: { fontFamily: 'JetBrains', fontSize: 12, marginTop: 4 },
  statusPill: {
    borderRadius: 8,
    fontFamily: 'JetBrains',
    fontSize: 11,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 34,
    marginTop: 14,
  },
  label: { fontFamily: 'JetBrains', fontSize: 11, marginBottom: 3 },
  amount: { color: '#27ae60', fontFamily: 'JetBrains', fontWeight: '400' },
  notes: {
    fontFamily: 'JetBrains',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  actions: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 9,
  },
  editBtn: { backgroundColor: '#8a6200' },
  deleteBtn: { backgroundColor: '#c0392b' },
  actionText: { color: '#fff', fontFamily: 'JetBrains', fontWeight: '400' },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 20,
  },
  emptyText: { fontFamily: 'JetBrains', marginTop: 24, textAlign: 'center' },
  errorText: { color: '#e74c3c', fontFamily: 'JetBrains', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#fcc01e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: '#000', fontFamily: 'JetBrains' },
  toast: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    bottom: 135,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    right: 12,
  },
  toastText: { color: '#fff', fontFamily: 'JetBrains', fontWeight: '400' },
  toastDismiss: {
    color: '#fcc01e',
    fontFamily: 'JetBrains',
    fontWeight: '400',
  },
  overlay: { flex: 1, justifyContent: 'center' },
  modal: {
    borderRadius: 12,
    bottom: '8%',
    left: '8%',
    maxHeight: '78%',
    padding: 20,
    position: 'absolute',
    width: '85%',
  },
  title: {
    fontFamily: 'JetBrains',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 16,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: 'JetBrains',
    marginBottom: 10,
    padding: 10,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statusBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  statusBtnText: { fontFamily: 'JetBrains', fontSize: 12, fontWeight: '400' },
  notesInput: { minHeight: 76, textAlignVertical: 'top' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#fcc01e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveText: { color: '#000', fontFamily: 'JetBrains' },
  disabledBtn: { opacity: 0.7 },
  confirmOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  confirmBox: { borderRadius: 12, padding: 18 },
  confirmTitle: {
    fontFamily: 'JetBrains',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 8,
  },
  confirmText: { fontFamily: 'JetBrains', fontSize: 14, lineHeight: 20 },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  cancelDeleteBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelDeleteText: { fontFamily: 'JetBrains', fontWeight: '400' },
  confirmDeleteBtn: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  confirmDeleteText: {
    color: '#fff',
    fontFamily: 'JetBrains',
    fontWeight: '400',
  },
});
