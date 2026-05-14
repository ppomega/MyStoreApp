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
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  createTenant,
  deleteTenant,
  getTenants,
  Tenant,
  TenantInput,
  updateTenant,
} from '../services/tenantsApi';
import {
  createTenantPayment,
  deleteTenantPayment,
  getTenantPayments,
  TenantPayment,
  TenantPaymentInput,
  updateTenantPayment,
} from '../services/tenantPaymentApi';
import {
  createTenantRent,
  deleteTenantRent,
  getTenantRents,
  markTenantRentPaid,
  TenantRent,
  TenantRentInput,
  updateTenantRent,
} from '../services/tenantRentApi';
import { useAppTheme } from '../theme/ThemeContext';

type TenantForm = Omit<
  TenantInput,
  'rent' | 'lastCreditedValue' | 'lastDebitedValue'
> & {
  rent: string;
  lastCreditedValue: string;
  lastDebitedValue: string;
};

const emptyForm: TenantForm = {
  name: '',
  phone: '',
  rent: '',
  doj: undefined,
  lastRent: undefined,
  lastCreditedValue: '0',
  lastDebitedValue: '0',
};

function formToPayload(form: TenantForm): TenantInput {
  return {
    ...form,
    name: form.name.trim(),
    phone: form.phone.trim(),
    rent: Number(form.rent) || 0,
    lastCreditedValue: Number(form.lastCreditedValue) || 0,
    lastDebitedValue: Number(form.lastDebitedValue) || 0,
  };
}

function tenantToForm(tenant: Tenant): TenantForm {
  return {
    name: tenant.name,
    phone: tenant.phone,
    rent: tenant.rent ? String(tenant.rent) : '',
    doj: tenant.doj,
    lastRent: tenant.lastRent,
    lastCreditedValue: String(tenant.lastCreditedValue || 0),
    lastDebitedValue: String(tenant.lastDebitedValue || 0),
  };
}

function formatDate(value: string | Date | undefined) {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function getTenantName(tenant: any) {
  if (!tenant) {
    return 'Unknown';
  }

  if (typeof tenant === 'string') {
    return tenant;
  }

  return tenant.name || 'Unknown';
}

export default function Tenants() {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'tenants' | 'rents' | 'payments'>(
    'tenants',
  );
  const [recordView, setRecordView] = useState<'new' | 'history'>('new');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rents, setRents] = useState<TenantRent[]>([]);
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [search, setSearch] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recordsError, setRecordsError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [pendingDeleteTenant, setPendingDeleteTenant] = useState<Tenant | null>(
    null,
  );
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editingRent, setEditingRent] = useState<TenantRent | null>(null);
  const [editingPayment, setEditingPayment] = useState<TenantPayment | null>(
    null,
  );
  const [paymentValue, setPaymentValue] = useState('');
  const [rentMonth, setRentMonth] = useState('');
  const [rentRoomRent, setRentRoomRent] = useState('');
  const [rentUnits, setRentUnits] = useState('');
  const [rentStatus, setRentStatus] = useState<'Paid' | 'Pending'>('Pending');
const [showDatePicker, setShowDatePicker] = useState(false);
const [selectedDate, setSelectedDate] = useState(new Date());
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [successMessage, setSuccessMessage] = useState('');

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError('');
      setTenants(await getTenants());
    } catch {
      setError('Could not load tenants from the server.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      setRecordsLoading(true);
      setRecordsError('');
      const [rentItems] = await Promise.all([
        getTenantRents(),
        // getTenantPayments(),
      ]);
      console.log('Loaded rents:', rentItems);
      setRents(rentItems);
      // setPayments(paymentItems);
    } catch(e) {
      console.error('Error loading records:', e);
      setRecordsError('Could not load rent and payment records.');
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
    loadRecords();
  }, []);

  const filteredTenants = tenants.filter(tenant =>
    [tenant.name, tenant.phone]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const filteredPickerTenants = tenants.filter(tenant =>
    [tenant.name, tenant.phone]
      .join(' ')
      .toLowerCase()
      .includes(pickerSearch.toLowerCase()),
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

  const resetRecordForm = () => {
    setSelectedTenant(null);
    setPaymentValue('');
    setRentMonth('');
    setRentRoomRent('');
    setRentUnits('');
    setRentStatus('Pending');
    setEditingRent(null);
    setEditingPayment(null);
  };

  const saveRecord = async () => {
    if (!selectedTenant) {
      Alert.alert('Missing tenant', 'Please select a tenant.');
      return;
    }

    try {
      setSaving(true);
      if (activeTab === 'rents') {
        const roomRent = Number(rentRoomRent);
        const units = Number(rentUnits);
        if (!rentRoomRent || Number.isNaN(roomRent) || roomRent < 0) {
          Alert.alert('Invalid rent', 'Please enter a valid room rent.');
          return;
        }
        if (!rentUnits || Number.isNaN(units) || units < 0) {
          Alert.alert('Invalid units', 'Please enter valid units.');
          return;
        }
        const payload: TenantRentInput = {
          tenant: selectedTenant.id,
          month: rentMonth ? new Date(rentMonth) : new Date(),
          roomRent,
          units,
          status: rentStatus,
        };
        if (editingRent) {
          const updated = await updateTenantRent(editingRent.id, payload);
          setRents(prev =>
            prev.map(rent => (rent.id === updated.id ? updated : rent)),
          );
          setSuccessMessage('Rent updated.');
        } else {
          const created = await createTenantRent(payload);
          setRents(prev => [created, ...prev]);
          setSuccessMessage('Rent recorded.');
        }
      } else {
        const numericValue = Number(paymentValue);
        if (!paymentValue || Number.isNaN(numericValue) || numericValue <= 0) {
          Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
          return;
        }
        const payload: TenantPaymentInput = {
          tenant: selectedTenant.id,
          paymentDate: new Date(),
          value: numericValue,
        };
        if (editingPayment) {
          const updated = await updateTenantPayment(editingPayment.id, payload);
          setPayments(prev =>
            prev.map(payment =>
              payment.id === updated.id ? updated : payment,
            ),
          );
          setSuccessMessage('Payment updated.');
        } else {
          const created = await createTenantPayment(payload);
          setPayments(prev => [created, ...prev]);
          setSuccessMessage('Payment recorded.');
        }
      }
      resetRecordForm();
      loadTenants();
    } catch {
      Alert.alert('Save failed', 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  };

  const startEditingRent = (rent: TenantRent) => {
    setActiveTab('rents');
    setRecordView('new');
    setEditingRent(rent);
    setEditingPayment(null);
    setSelectedTenant(getTenantName(rent.tenant));
    setRentMonth(rent.month ? rent.month.toISOString().slice(0, 10) : '');
    setRentRoomRent(String(rent.roomRent));
    setRentUnits(String(rent.units));
    setRentStatus(rent.status);
  };

  const startEditingPayment = (payment: TenantPayment) => {
    setActiveTab('payments');
    setRecordView('new');
    setEditingPayment(payment);
    setEditingRent(null);
    setSelectedTenant(
      tenants.find(tenant => tenant.id === payment.tenant) ?? null,
    );
    setPaymentValue(String(payment.value));
  };

  const handleMarkRentPaid = async (rent: TenantRent) => {
    try {
      const updated = await markTenantRentPaid(rent.id);
      setRents(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      setSuccessMessage('Rent marked paid.');
      loadTenants();
    } catch {
      Alert.alert('Update failed', 'Could not mark this rent as paid.');
    }
  };

  const handleDeleteRent = async (rent: TenantRent) => {
    try {
      await deleteTenantRent(rent.id);
      setRents(prev => prev.filter(item => item.id !== rent.id));
      setSuccessMessage('Rent deleted.');
      loadTenants();
    } catch {
      Alert.alert('Delete failed', 'Could not delete the rent record.');
    }
  };

  const handleDeletePayment = async (payment: TenantPayment) => {
    try {
      await deleteTenantPayment(payment.id);
      setPayments(prev => prev.filter(item => item.id !== payment.id));
      setSuccessMessage('Payment deleted.');
      loadTenants();
    } catch {
      Alert.alert('Delete failed', 'Could not delete the payment record.');
    }
  };

  const renderTenant = ({ item }: { item: Tenant }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.name || 'Tenant'}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {item.phone || 'No phone'}
          </Text>
        </View>
        <Text style={[styles.statusPill, { backgroundColor: colors.surfaceMuted, color: colors.text }]}>
          {item.doj ? formatDate(item.doj) : 'New'}
        </Text>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            Current rent
          </Text>
          <Text style={styles.amount}>Rs {item.rent}</Text>
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            Last rent
          </Text>
          <Text style={styles.amount}>
            {item.lastRent ? formatDate(item.lastRent) : 'No date'}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            Last credited
          </Text>
          <Text style={styles.amount}>Rs {item.lastCreditedValue}</Text>
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            Last debited
          </Text>
          <Text style={styles.amount}>Rs {item.lastDebitedValue}</Text>
        </View>
      </View>

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

  const renderRecordForm = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        {editingRent || editingPayment ? (
          <View style={styles.editingBanner}>
            <View>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Editing {activeTab === 'rents' ? 'rent' : 'payment'}
              </Text>
              <Text style={[styles.name, { color: colors.text }]}>
                Rs {activeTab === 'rents' ? rentRoomRent || 0 : paymentValue || 0}
              </Text>
            </View>
            <TouchableOpacity onPress={resetRecordForm}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.itemSelector, { borderColor: colors.border }]}
          onPress={() => setPickerVisible(true)}
        >
          <View>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Tenant
            </Text>
            <Text style={[styles.selectorValue, { color: colors.text }]}>
              {selectedTenant ? selectedTenant.name : 'Select tenant'}
            </Text>
          </View>
          <Icon name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        {activeTab === 'rents' ? (
          <>
          <TouchableOpacity
  style={[
    styles.input,
    {
      backgroundColor: colors.input,
      borderColor: colors.border,
      justifyContent: 'center',
    },
  ]}
  onPress={() => setShowDatePicker(true)}
>
  <Text
    style={{
      color: rentMonth ? colors.text : '#999',
      fontFamily: 'JetBrains',
    }}
  >
    {rentMonth || 'Select month'}
  </Text>
</TouchableOpacity>

<DatePicker
  modal
  mode="date"
  open={showDatePicker}
  date={selectedDate}
  onConfirm={date => {
    setShowDatePicker(false);
    setSelectedDate(date);
    setRentMonth(date.toISOString().slice(0, 10));
  }}
  onCancel={() => {
    setShowDatePicker(false);
  }}
/>
            <View style={styles.formRow}>
              <TextInput
                placeholder="Room rent"
                placeholderTextColor="#999"
                value={rentRoomRent}
                onChangeText={setRentRoomRent}
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
                placeholder="Units"
                placeholderTextColor="#999"
                value={rentUnits}
                onChangeText={setRentUnits}
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
              {(['Pending', 'Paid'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusBtn,
                    {
                      backgroundColor:
                        rentStatus === status
                          ? colors.navActive
                          : colors.surfaceMuted,
                    },
                  ]}
                  onPress={() => setRentStatus(status)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      {
                        color:
                          rentStatus === status &&
                          colors.navActive === colors.accent
                            ? '#000'
                            : colors.text,
                      },
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <TextInput
            placeholder="Payment amount (Rs)"
            placeholderTextColor="#999"
            value={paymentValue}
            onChangeText={setPaymentValue}
            keyboardType="numeric"
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          onPress={saveRecord}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving
              ? 'Saving...'
              : editingRent || editingPayment
              ? `Update ${activeTab === 'rents' ? 'Rent' : 'Payment'}`
              : `Record ${activeTab === 'rents' ? 'Rent' : 'Payment'}`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderRecordHistory = () => {
    const records = activeTab === 'rents' ? rents : payments;

    return (
      <ScrollView contentContainerStyle={styles.listContent}>
        {records.map(record => (
          <View
            key={record.id}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleWrap}>
                <Text style={[styles.name, { color: colors.text }]}>
                  {getTenantName(record.tenant)}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {formatDate(
                    activeTab === 'rents'
                      ? (record as TenantRent).month
                      : (record as TenantPayment).paymentDate,
                  )}
                </Text>
              </View>
              {activeTab === 'rents' ? (
                <Text
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        (record as TenantRent).status === 'Paid'
                          ? colors.success
                          : colors.surfaceMuted,
                      color:
                        (record as TenantRent).status === 'Paid'
                          ? '#fff'
                          : colors.text,
                    },
                  ]}
                >
                  {(record as TenantRent).status}
                </Text>
              ) : (
                <Text style={styles.amount}>
                  Rs {(record as TenantPayment).value}
                </Text>
              )}
            </View>
            {activeTab === 'rents' ? (
              <View style={styles.amountRow}>
                <View>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Room rent
                  </Text>
                  <Text style={styles.amount}>
                    Rs {(record as TenantRent).roomRent}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Units
                  </Text>
                  <Text style={styles.amount}>
                    {(record as TenantRent).units}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={[styles.actions, { borderTopColor: colors.border }]}>
              {activeTab === 'rents' &&
              (record as TenantRent).status !== 'Paid' ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.payBtn]}
                  onPress={() => handleMarkRentPaid(record as TenantRent)}
                >
                  <Text style={styles.actionText}>Paid</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() =>
                  activeTab === 'rents'
                    ? startEditingRent(record as TenantRent)
                    : startEditingPayment(record as TenantPayment)
                }
              >
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() =>
                  activeTab === 'rents'
                    ? handleDeleteRent(record as TenantRent)
                    : handleDeletePayment(record as TenantPayment)
                }
              >
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {!records.length ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No {activeTab === 'rents' ? 'rent' : 'payment'} records found.
          </Text>
        ) : null}
      </ScrollView>
    );
  };

  // ── FIXED: New form always renders; error/loading only blocks History ──
  const renderRecordTab = () => (
    <>
      <View style={[styles.subSwitch, { backgroundColor: colors.surface }]}>
        {(['new', 'history'] as const).map(view => (
          <TouchableOpacity
            key={view}
            style={[
              styles.subSwitchBtn,
              recordView === view && { backgroundColor: colors.navActive },
            ]}
            onPress={() => setRecordView(view)}
          >
            <Text
              style={[
                styles.subSwitchText,
                {
                  color:
                    recordView === view && colors.navActive === colors.accent
                      ? '#000'
                      : colors.text,
                },
              ]}
            >
              {view === 'new' ? 'New' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {recordView === 'new' ? (
        renderRecordForm()
      ) : recordsLoading ? (
        <ActivityIndicator color="#fcc01e" style={{ marginTop: 24 }} />
      ) : recordsError ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{recordsError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadRecords}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        renderRecordHistory()
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.viewSwitch, { backgroundColor: colors.surface }]}>
        {(['tenants', 'rents', 'payments'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.viewSwitchBtn,
              activeTab === tab && { backgroundColor: colors.navActive },
            ]}
            onPress={() => {
              setActiveTab(tab);
              resetRecordForm();
            }}
          >
            <Text
              style={[
                styles.viewSwitchText,
                {
                  color:
                    activeTab === tab && colors.navActive === colors.accent
                      ? '#000'
                      : colors.text,
                },
              ]}
            >
              {tab === 'tenants' ? 'Tenants' : tab === 'rents' ? 'Rent' : 'Payments'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'tenants' ? (
        <>
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
        </>
      ) : (
        renderRecordTab()
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
                onChangeText={text => setForm(prev => ({ ...prev, name: text }))}
                style={[
                  styles.input,
                  { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                ]}
              />
              <TextInput
                placeholder="Phone"
                placeholderTextColor="#999"
                value={form.phone}
                onChangeText={text => setForm(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                ]}
              />
              <View style={styles.formRow}>
                <TextInput
                  placeholder="Rent"
                  placeholderTextColor="#999"
                  value={form.rent}
                  onChangeText={text => setForm(prev => ({ ...prev, rent: text }))}
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    styles.halfInput,
                    { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                  ]}
                />
                <TextInput
                  placeholder="Last credited"
                  placeholderTextColor="#999"
                  value={form.lastCreditedValue}
                  onChangeText={text =>
                    setForm(prev => ({ ...prev, lastCreditedValue: text }))
                  }
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    styles.halfInput,
                    { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                  ]}
                />
              </View>
              <TextInput
                placeholder="Last debited"
                placeholderTextColor="#999"
                value={form.lastDebitedValue}
                onChangeText={text =>
                  setForm(prev => ({ ...prev, lastDebitedValue: text }))
                }
                keyboardType="numeric"
                style={[
                  styles.input,
                  { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                ]}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.saveText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(pendingDeleteTenant)} animationType="fade" transparent>
        <View style={[styles.confirmOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
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

      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.picker, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.title, { color: colors.text }]}>Select Tenant</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.closePicker}>Close</Text>
              </TouchableOpacity>
            </View>
            <View>
              <Icon name="search" size={16} color="#999" style={styles.searchIcon} />
              <TextInput
                placeholder="Search tenants"
                placeholderTextColor="#999"
                value={pickerSearch}
                onChangeText={setPickerSearch}
                style={[styles.search, { backgroundColor: colors.input, color: colors.text }]}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredPickerTenants.map(tenant => (
                <TouchableOpacity
                  key={tenant.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedTenant(tenant);
                    if (activeTab === 'rents' && !editingRent) {
                      setRentRoomRent(tenant.rent ? String(tenant.rent) : '');
                    }
                    setPickerVisible(false);
                    setPickerSearch('');
                  }}
                >
                  <View>
                    <Text style={[styles.name, { color: colors.text }]}>{tenant.name}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {tenant.phone || 'No phone'}
                    </Text>
                  </View>
                  <Text style={styles.amount}>Rs {tenant.rent}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  viewSwitch: { borderRadius: 10, flexDirection: 'row', marginBottom: 12, padding: 4 },
  viewSwitchBtn: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 10 },
  viewSwitchText: { fontFamily: 'JetBrains', fontSize: 13 },
  subSwitch: { borderRadius: 8, flexDirection: 'row', marginBottom: 10, padding: 3 },
  subSwitchBtn: { alignItems: 'center', borderRadius: 6, flex: 1, paddingVertical: 8 },
  subSwitchText: { fontFamily: 'JetBrains', fontSize: 12 },
  searchIcon: { left: 10, position: 'absolute', top: 12, zIndex: 1 },
  search: { borderRadius: 10, fontFamily: 'JetBrains', height: 45, marginBottom: 10, paddingHorizontal: 30 },
  addBtn: { alignItems: 'center', backgroundColor: '#fcc01e', borderRadius: 10, marginBottom: 10, padding: 10 },
  addText: { color: '#000', fontFamily: 'JetBrains', fontWeight: '400' },
  listContent: { paddingBottom: 130 },
  card: { borderRadius: 12, marginBottom: 12, padding: 14 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  cardTitleWrap: { flex: 1 },
  name: { fontFamily: 'JetBrains', fontSize: 16, fontWeight: '400' },
  meta: { fontFamily: 'JetBrains', fontSize: 12, marginTop: 4 },
  statusPill: { borderRadius: 8, fontFamily: 'JetBrains', fontSize: 11, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
  amountRow: { flexDirection: 'row', gap: 34, marginTop: 14 },
  label: { fontFamily: 'JetBrains', fontSize: 11, marginBottom: 3 },
  amount: { color: '#27ae60', fontFamily: 'JetBrains', fontWeight: '400' },
  notes: { fontFamily: 'JetBrains', fontSize: 12, lineHeight: 18, marginTop: 12 },
  panel: { borderRadius: 12, padding: 14 },
  editingBanner: { alignItems: 'center', borderBottomColor: '#f0f0f0', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12 },
  cancelText: { color: '#c0392b', fontFamily: 'JetBrains', fontWeight: '400' },
  itemSelector: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 12 },
  selectorValue: { fontFamily: 'JetBrains', fontWeight: '400', maxWidth: 240 },
  actions: { borderTopWidth: 1, flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12 },
  actionBtn: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 9 },
  payBtn: { backgroundColor: '#111' },
  editBtn: { backgroundColor: '#8a6200' },
  deleteBtn: { backgroundColor: '#c0392b' },
  actionText: { color: '#fff', fontFamily: 'JetBrains', fontWeight: '400' },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 32, paddingHorizontal: 20 },
  emptyText: { fontFamily: 'JetBrains', marginTop: 24, textAlign: 'center' },
  errorText: { color: '#e74c3c', fontFamily: 'JetBrains', textAlign: 'center' },
  retryBtn: { backgroundColor: '#fcc01e', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: '#000', fontFamily: 'JetBrains' },
  toast: { alignItems: 'center', backgroundColor: '#111', borderRadius: 10, bottom: 135, flexDirection: 'row', justifyContent: 'space-between', left: 12, paddingHorizontal: 14, paddingVertical: 12, position: 'absolute', right: 12 },
  toastText: { color: '#fff', fontFamily: 'JetBrains', fontWeight: '400' },
  toastDismiss: { color: '#fcc01e', fontFamily: 'JetBrains', fontWeight: '400' },
  overlay: { flex: 1, justifyContent: 'center' },
  modal: { borderRadius: 12, bottom: '8%', left: '8%', maxHeight: '78%', padding: 20, position: 'absolute', width: '85%' },
  title: { fontFamily: 'JetBrains', fontSize: 18, fontWeight: '400', marginBottom: 16 },
  input: { borderRadius: 8, borderWidth: 1, fontFamily: 'JetBrains', marginBottom: 10, padding: 10 },
  formRow: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statusBtn: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 10 },
  statusBtnText: { fontFamily: 'JetBrains', fontSize: 12, fontWeight: '400' },
  notesInput: { minHeight: 76, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 10 },
  saveBtn: { alignItems: 'center', backgroundColor: '#fcc01e', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  saveText: { color: '#000', fontFamily: 'JetBrains' },
  disabledBtn: { opacity: 0.7 },
  confirmOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  confirmBox: { borderRadius: 12, padding: 18 },
  confirmTitle: { fontFamily: 'JetBrains', fontSize: 18, fontWeight: '400', marginBottom: 8 },
  confirmText: { fontFamily: 'JetBrains', fontSize: 14, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 18 },
  cancelDeleteBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  cancelDeleteText: { fontFamily: 'JetBrains', fontWeight: '400' },
  confirmDeleteBtn: { backgroundColor: '#e74c3c', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  confirmDeleteText: { color: '#fff', fontFamily: 'JetBrains', fontWeight: '400' },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  picker: { borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '78%', padding: 14 },
  pickerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  closePicker: { color: '#8a6200', fontFamily: 'JetBrains', fontWeight: '400' },
  pickerItem: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
});