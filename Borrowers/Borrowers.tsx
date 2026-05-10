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
  Borrower,
  BorrowerInput,
  createBorrower,
  deleteBorrower,
  getBorrowers,
  updateBorrower,
} from '../services/borrowersApi';
import {
  BorrowerDebt,
  BorrowerDebtInput,
  createBorrowerDebt,
  deleteBorrowerDebt,
  getBorrowerDebts,
  updateBorrowerDebt,
} from '../services/borrowerDebtApi';
import { useAppTheme } from '../theme/ThemeContext';

// ─── Borrower form types ──────────────────────────────────────────────────────

type BorrowerForm = BorrowerInput;

const emptyBorrowerForm: BorrowerForm = {
  name: '',
  phone: '',
  debt: '' as unknown as number,
  lastCredit: undefined,
  lastDebit: undefined,
  lastCreditedValue: 0,
  lastDebitedValue: 0,
};

function formToPayload(form: BorrowerForm): BorrowerInput {
  return {
    ...form,
    name: form.name.trim(),
    phone: form.phone.trim(),
    debt: Number(form.debt) || 0,
    lastCreditedValue: Number(form.lastCreditedValue) || 0,
    lastDebitedValue: Number(form.lastDebitedValue) || 0,
    lastCredit: form.lastCredit || new Date(Date.now()),
    lastDebit: form.lastDebit || new Date(Date.now()),
  };
}

function borrowerToForm(borrower: Borrower): BorrowerForm {
  return {
    name: borrower.name,
    phone: borrower.phone,
    debt: borrower.debt,
    lastCredit: borrower.lastCredit,
    lastDebit: borrower.lastDebit,
    lastCreditedValue: borrower.lastCreditedValue,
    lastDebitedValue: borrower.lastDebitedValue,
  };
}

// ─── Debt helpers ─────────────────────────────────────────────────────────────

function formatDate(value: string | Date | undefined) {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function getBorrowerName(borrowers: Borrower[], borrowerId: string) {
  return borrowers.find(b => b.id === borrowerId)?.name ?? 'Unknown';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BorrowersScreen() {
  const { colors } = useAppTheme();

  // ── Top-level tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'borrowers' | 'debts'>('borrowers');

  // ── Shared data ─────────────────────────────────────────────────────────────
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [debts, setDebts] = useState<BorrowerDebt[]>([]);

  // ── Borrowers tab state ─────────────────────────────────────────────────────
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [borrowersLoading, setBorrowersLoading] = useState(true);
  const [borrowersError, setBorrowersError] = useState('');
  const [borrowerSaving, setBorrowerSaving] = useState(false);
  const [borrowerModalVisible, setBorrowerModalVisible] = useState(false);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const [pendingDeleteBorrower, setPendingDeleteBorrower] = useState<Borrower | null>(null);
  const [borrowerForm, setBorrowerForm] = useState<BorrowerForm>(emptyBorrowerForm);

  // ── Debts tab state ─────────────────────────────────────────────────────────
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [debtsError, setDebtsError] = useState('');
  const [debtSaving, setDebtSaving] = useState(false);
  const [debtPickerVisible, setDebtPickerVisible] = useState(false);
  const [debtPickerSearch, setDebtPickerSearch] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [debtValue, setDebtValue] = useState('');
  const [debtTaken, setDebtTaken] = useState('');
  const [editingDebt, setEditingDebt] = useState<BorrowerDebt | null>(null);
  const [debtActiveView, setDebtActiveView] = useState<'new' | 'history'>('new');

  // ── Shared toast ────────────────────────────────────────────────────────────
  const [successMessage, setSuccessMessage] = useState('');

  // ── Loaders ─────────────────────────────────────────────────────────────────

  const loadBorrowers = async () => {
    try {
      setBorrowersLoading(true);
      setBorrowersError('');
      setBorrowers(await getBorrowers());
    } catch {
      setBorrowersError('Could not load borrowers from the server.');
    } finally {
      setBorrowersLoading(false);
    }
  };

  const loadDebts = async () => {
    try {
      setDebtsLoading(true);
      setDebtsError('');
      setDebts(await getBorrowerDebts());
    } catch {
      setDebtsError('Could not load debts from the server.');
    } finally {
      setDebtsLoading(false);
    }
  };

  useEffect(() => {
    loadBorrowers();
    loadDebts();
  }, []);

  // ── Borrower CRUD ────────────────────────────────────────────────────────────

  const openCreateBorrower = () => {
    setEditingBorrower(null);
    setBorrowerForm(emptyBorrowerForm);
    setBorrowerModalVisible(true);
  };

  const openEditBorrower = (borrower: Borrower) => {
    setEditingBorrower(borrower);
    setBorrowerForm(borrowerToForm(borrower));
    setBorrowerModalVisible(true);
  };

  const handleSaveBorrower = async () => {
    if (!borrowerForm.name.trim()) {
      Alert.alert('Missing name', 'Please enter borrower name.');
      return;
    }
    try {
      setBorrowerSaving(true);
      const payload = formToPayload(borrowerForm);
      if (editingBorrower) {
        const updated = await updateBorrower(editingBorrower.id, payload);
        setBorrowers(prev =>
          prev.map(b => (b.id === editingBorrower.id ? updated : b)),
        );
        setSuccessMessage('Borrower updated.');
      } else {
        const created = await createBorrower(payload);
        setBorrowers(prev => [created, ...prev]);
        setSuccessMessage('Borrower added.');
      }
      setBorrowerModalVisible(false);
      setEditingBorrower(null);
      setBorrowerForm(emptyBorrowerForm);
    } catch {
      Alert.alert('Save failed', 'Could not save the borrower.');
    } finally {
      setBorrowerSaving(false);
    }
  };

  const removeBorrower = async (borrower: Borrower) => {
    try {
      await deleteBorrower(borrower.id);
      setBorrowers(prev => prev.filter(b => b.id !== borrower.id));
      setPendingDeleteBorrower(null);
      setSuccessMessage('Borrower deleted.');
    } catch {
      Alert.alert('Delete failed', 'Could not delete the borrower.');
    }
  };

  // ── Debt CRUD ─────────────────────────────────────────────────────────────

  const resetDebtForm = () => {
    setSelectedBorrower(null);
    setDebtValue('');
    setDebtTaken('');
    setEditingDebt(null);
  };

  const startEditingDebt = (debt: BorrowerDebt) => {
    setEditingDebt(debt);
    setSelectedBorrower(borrowers.find(b => b.id === debt.borrower) ?? null);
    setDebtValue(String(debt.value));
    setDebtTaken(debt.debtTaken ? new Date(debt.debtTaken).toISOString().slice(0, 10) : '');
    setDebtActiveView('new');
    setSuccessMessage('');
  };

  const handleSaveDebt = async () => {
    if (!selectedBorrower) {
      Alert.alert('Missing borrower', 'Please select a borrower.');
      return;
    }
    const numericValue = Number(debtValue);
    if (!debtValue || Number.isNaN(numericValue) || numericValue <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid debt amount.');
      return;
    }
    const payload: BorrowerDebtInput = {
      borrower: selectedBorrower.id,
      value: numericValue,
      debtTaken: debtTaken ? new Date(debtTaken) : new Date(),
    };
    try {
      setDebtSaving(true);
      if (editingDebt) {
        const updated = await updateBorrowerDebt(editingDebt.id, payload);
        setDebts(prev => prev.map(d => (d.id === updated.id ? updated : d)));
        setSuccessMessage('Debt updated.');
      } else {
        const created = await createBorrowerDebt(payload);
        setDebts(prev => [created, ...prev]);
        setSuccessMessage('Debt recorded.');
      }
      resetDebtForm();
      // Refresh borrowers so the server-recomputed debt total
      // is reflected on Borrower cards immediately.
      loadBorrowers();
    } catch {
      Alert.alert('Save failed', 'Could not save the debt entry.');
    } finally {
      setDebtSaving(false);
    }
  };

  const handleDeleteDebt = (debt: BorrowerDebt) => {
    Alert.alert(
      'Delete debt?',
      `Remove Rs ${debt.value} from ${getBorrowerName(borrowers, debt.borrower)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBorrowerDebt(debt.id);
              setDebts(prev => prev.filter(d => d.id !== debt.id));
              setSuccessMessage('Debt deleted.');
              // Refresh borrowers so the recomputed total is reflected.
              loadBorrowers();
            } catch {
              Alert.alert('Delete failed', 'Could not delete the debt.');
            }
          },
        },
      ],
    );
  };

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredBorrowers = borrowers.filter(b =>
    [b.name, b.phone].join(' ').toLowerCase().includes(borrowerSearch.toLowerCase()),
  );

  const filteredPickerBorrowers = borrowers.filter(b =>
    [b.name, b.phone].join(' ').toLowerCase().includes(debtPickerSearch.toLowerCase()),
  );

  // ── Render borrower card ──────────────────────────────────────────────────

  const renderBorrower = ({ item }: { item: Borrower }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.name || 'Borrower'}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {item.phone}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={[styles.label, { color: colors.textMuted }]}>Udhar</Text>
          <Text style={styles.amount}>Rs {item.debt}</Text>
        </View>
      </View>

      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditBorrower(item)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => setPendingDeleteBorrower(item)}
        >
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Top-level tab switch ─────────────────────────────────────────── */}
      <View style={[styles.viewSwitch, { backgroundColor: colors.surface }]}>
        {(['borrowers', 'debts'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.viewSwitchBtn,
              activeTab === tab && { backgroundColor: colors.navActive },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.viewSwitchText,
                {
                  color:
                    activeTab === tab
                      ? colors.navActive === colors.accent ? '#000' : '#fff'
                      : colors.text,
                },
              ]}
            >
              {tab === 'borrowers' ? 'Borrowers' : 'Debts'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ════════════════════════════════════════════════════════════════════
          BORROWERS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'borrowers' ? (
        <>
          <View>
            <Icon name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              placeholder="Search borrowers"
              placeholderTextColor="#999"
              value={borrowerSearch}
              onChangeText={setBorrowerSearch}
              style={[styles.search, { backgroundColor: colors.input, color: colors.text }]}
            />
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={openCreateBorrower}>
            <Text style={styles.addText}>+ Add Borrower</Text>
          </TouchableOpacity>

          {borrowersLoading ? (
            <ActivityIndicator color="#fcc01e" style={{ marginTop: 24 }} />
          ) : borrowersError ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{borrowersError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadBorrowers}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredBorrowers}
              keyExtractor={item => item.id}
              renderItem={renderBorrower}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No borrowers found.
                </Text>
              }
            />
          )}
        </>

      ) : (
      /* ════════════════════════════════════════════════════════════════════
          DEBTS TAB
      ════════════════════════════════════════════════════════════════════ */
        <>
          {/* Debt sub-tab: New / History */}
          <View style={[styles.subSwitch, { backgroundColor: colors.surface }]}>
            {(['new', 'history'] as const).map(sub => (
              <TouchableOpacity
                key={sub}
                style={[
                  styles.subSwitchBtn,
                  debtActiveView === sub && { backgroundColor: colors.navActive },
                ]}
                onPress={() => setDebtActiveView(sub)}
              >
                <Text
                  style={[
                    styles.subSwitchText,
                    {
                      color:
                        debtActiveView === sub
                          ? colors.navActive === colors.accent ? '#000' : '#fff'
                          : colors.text,
                    },
                  ]}
                >
                  {sub === 'new' ? (editingDebt ? 'Edit Debt' : 'New Debt') : 'History'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Debt History ─────────────────────────────────────────────── */}
          {debtActiveView === 'history' ? (
            <ScrollView contentContainerStyle={styles.listContent}>
              {debtsLoading ? (
                <ActivityIndicator color="#fcc01e" style={{ marginTop: 24 }} />
              ) : debtsError ? (
                <View style={styles.emptyState}>
                  <Text style={styles.errorText}>{debtsError}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={loadDebts}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : debts.length ? (
                debts.map(debt => (
                  <View
                    key={debt.id}
                    style={[styles.card, { backgroundColor: colors.surface }]}
                  >
                    <View style={styles.debtCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.name, { color: colors.text }]}>
                          {getBorrowerName(borrowers, debt.borrower)}
                        </Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]}>
                          Taken: {formatDate(debt.debtTaken)}
                        </Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]}>
                          Recorded: {formatDate(debt.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.amount}>Rs {debt.value}</Text>
                    </View>

                    <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => {
                          startEditingDebt(debt);
                          setActiveTab('debts');
                        }}
                      >
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteDebt(debt)}
                      >
                        <Text style={styles.actionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={[styles.emptyPanel, { backgroundColor: colors.surface }]}>
                  <Icon name="list-alt" size={26} color={colors.accent} />
                  <Text style={[styles.name, { color: colors.text, marginTop: 12 }]}>
                    No debts recorded yet
                  </Text>
                  <Text style={[styles.meta, { color: colors.textMuted, textAlign: 'center', marginTop: 6 }]}>
                    Recorded debts will appear here once they are created.
                  </Text>
                </View>
              )}
            </ScrollView>

          ) : (
          /* ── New / Edit Debt form ───────────────────────────────────── */
            <ScrollView
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.panel, { backgroundColor: colors.surface }]}>

                {/* Editing banner */}
                {editingDebt ? (
                  <View style={styles.editingBanner}>
                    <View>
                      <Text style={[styles.label, { color: colors.textMuted }]}>
                        Editing debt
                      </Text>
                      <Text style={[styles.name, { color: colors.text }]}>
                        {getBorrowerName(borrowers, editingDebt.borrower)} — Rs {editingDebt.value}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={resetDebtForm}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Borrower picker */}
                <TouchableOpacity
                  style={[styles.itemSelector, { borderColor: colors.border }]}
                  onPress={() => setDebtPickerVisible(true)}
                >
                  <View>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Borrower</Text>
                    <Text style={[styles.selectorValue, { color: colors.text }]} numberOfLines={1}>
                      {selectedBorrower ? selectedBorrower.name : 'Select borrower'}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={14} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Amount */}
                <TextInput
                  placeholder="Debt amount (Rs)"
                  placeholderTextColor="#999"
                  value={debtValue}
                  onChangeText={setDebtValue}
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                  ]}
                />

                {/* Date */}
                <TextInput
                  placeholder="Date taken (YYYY-MM-DD) — leave blank for today"
                  placeholderTextColor="#999"
                  value={debtTaken}
                  onChangeText={setDebtTaken}
                  style={[
                    styles.input,
                    { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                  ]}
                />

                {/* Save */}
                <TouchableOpacity
                  style={[styles.saveBtn, debtSaving && styles.disabledBtn]}
                  onPress={handleSaveDebt}
                  disabled={debtSaving}
                >
                  <Text style={styles.saveBtnText}>
                    {debtSaving ? 'Saving...' : editingDebt ? 'Update Debt' : 'Record Debt'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {successMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{successMessage}</Text>
          <TouchableOpacity onPress={() => setSuccessMessage('')}>
            <Text style={styles.toastDismiss}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Borrower add/edit modal ────────────────────────────────────────── */}
      <Modal visible={borrowerModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
        >
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingBorrower ? 'Edit Borrower' : 'Add Borrower'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                placeholder="Name"
                placeholderTextColor="#999"
                value={borrowerForm.name}
                onChangeText={text => setBorrowerForm(prev => ({ ...prev, name: text }))}
                style={[
                  styles.input,
                  { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                ]}
              />
              <TextInput
                placeholder="Phone"
                placeholderTextColor="#999"
                value={borrowerForm.phone}
                onChangeText={text => setBorrowerForm(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                ]}
              />
              <TextInput
                placeholder="Initial Debt"
                placeholderTextColor="#999"
                value={String(borrowerForm.debt)}
                onChangeText={text => setBorrowerForm(prev => ({ ...prev, debt: Number(text) }))}
                keyboardType="numeric"
                style={[
                  styles.input,
                  { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                ]}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, borrowerSaving && styles.disabledBtn]}
                onPress={handleSaveBorrower}
                disabled={borrowerSaving}
              >
                <Text style={styles.saveBtnText}>
                  {borrowerSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => setBorrowerModalVisible(false)}
              >
                <Text style={styles.saveBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Borrower delete confirm modal ──────────────────────────────────── */}
      <Modal visible={Boolean(pendingDeleteBorrower)} animationType="fade" transparent>
        <View style={[styles.confirmOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete borrower?</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              This will permanently delete "{pendingDeleteBorrower?.name}".
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.cancelDeleteBtn, { borderColor: colors.border }]}
                onPress={() => setPendingDeleteBorrower(null)}
              >
                <Text style={[styles.cancelDeleteText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => pendingDeleteBorrower ? removeBorrower(pendingDeleteBorrower) : null}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Debt borrower picker modal ─────────────────────────────────────── */}
      <Modal visible={debtPickerVisible} animationType="slide" transparent>
        <View style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.picker, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Borrower</Text>
              <TouchableOpacity onPress={() => setDebtPickerVisible(false)}>
                <Text style={styles.closePicker}>Close</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Icon name="search" size={16} color="#999" style={styles.searchIcon} />
              <TextInput
                placeholder="Search borrowers"
                placeholderTextColor="#999"
                value={debtPickerSearch}
                onChangeText={setDebtPickerSearch}
                style={[styles.search, { backgroundColor: colors.input, color: colors.text }]}
              />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredPickerBorrowers.map(borrower => (
                <TouchableOpacity
                  key={borrower.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedBorrower(borrower);
                    setDebtPickerVisible(false);
                    setDebtPickerSearch('');
                  }}
                >
                  <View>
                    <Text style={[styles.pickerItemName, { color: colors.text }]}>
                      {borrower.name}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {borrower.phone}
                    </Text>
                  </View>
                  <Text style={styles.amount}>Rs {borrower.debt}</Text>
                </TouchableOpacity>
              ))}
              {filteredPickerBorrowers.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No borrowers found.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },

  // Tab switches
  viewSwitch: {
    borderRadius: 10,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 4,
  },
  viewSwitchBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  viewSwitchText: { fontFamily: 'JetBrains', fontSize: 13 },

  subSwitch: {
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 3,
  },
  subSwitchBtn: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    paddingVertical: 8,
  },
  subSwitchText: { fontFamily: 'JetBrains', fontSize: 12 },

  // Search
  searchIcon: { left: 10, position: 'absolute', top: 12, zIndex: 1 },
  search: {
    borderRadius: 10,
    fontFamily: 'JetBrains',
    height: 45,
    marginBottom: 10,
    paddingHorizontal: 30,
  },

  // Add button
  addBtn: {
    alignItems: 'center',
    backgroundColor: '#fcc01e',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
  },
  addText: { color: '#000', fontFamily: 'JetBrains', fontWeight: '400' },

  // List
  listContent: { paddingBottom: 130 },

  // Cards
  card: { borderRadius: 12, marginBottom: 12, padding: 14 },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  cardTitleWrap: { flex: 1 },
  debtCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  name: { fontFamily: 'JetBrains', fontSize: 16, fontWeight: '400' },
  meta: { fontFamily: 'JetBrains', fontSize: 12, marginTop: 4 },
  amountRow: { flexDirection: 'row', gap: 34, marginTop: 14 },
  label: { fontFamily: 'JetBrains', fontSize: 11, marginBottom: 3 },
  amount: { color: '#e74c3c', fontFamily: 'JetBrains', fontWeight: '400' },
  cardActions: {
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

  // Empty / error
  emptyPanel: {
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
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

  // Debt form
  panel: { borderRadius: 12, padding: 14 },
  editingBanner: {
    alignItems: 'center',
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
  },
  cancelText: { color: '#c0392b', fontFamily: 'JetBrains', fontWeight: '400' },
  itemSelector: {
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
  },
  selectorValue: { fontFamily: 'JetBrains', fontWeight: '400', maxWidth: 240 },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: 'JetBrains',
    marginBottom: 10,
    padding: 10,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#fcc01e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnText: { color: '#000', fontFamily: 'JetBrains', fontWeight: '400' },
  disabledBtn: { opacity: 0.5 },

  // Toast
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
  toastDismiss: { color: '#fcc01e', fontFamily: 'JetBrains', fontWeight: '400' },

  // Borrower modal
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
  modalTitle: {
    fontFamily: 'JetBrains',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },

  // Delete confirm
  confirmOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  confirmBox: { borderRadius: 12, padding: 18 },
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
  confirmDeleteText: { color: '#fff', fontFamily: 'JetBrains', fontWeight: '400' },

  // Debt picker modal
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  picker: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '78%',
    padding: 14,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  closePicker: { color: '#8a6200', fontFamily: 'JetBrains', fontWeight: '400' },
  pickerItem: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pickerItemName: { fontFamily: 'JetBrains', fontWeight: '400' },
});