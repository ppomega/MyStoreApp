import React, { useEffect, useState } from "react";
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
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  getInventoryModePrice,
  getInventoryModeRankGroup,
  INVENTORY_MODE_RANK_GROUPS,
  InventoryItem,
  InventoryItemInput,
  InventoryMode,
  InventoryModeKey,
  updateInventoryItem,
} from "../services/inventoryApi";
import { useAppTheme } from "../theme/ThemeContext";

type InventoryForm = Omit<InventoryItemInput, "mode"> & {
  mode: Partial<Record<InventoryModeKey, string>>;
};

const emptyForm: InventoryForm = {
  name: "",
  sellingPrice: "",
  buyingPrice: "",
  mode: {},
  defaultMode: "Piece",
  category: "",
  weight: "",
};

const formFields: Array<{
  label: string;
  key: keyof Omit<InventoryForm, "mode">;
  keyboardType?: "default" | "numeric";
}> = [
  { label: "Name", key: "name" },
  { label: "Selling Price", key: "sellingPrice", keyboardType: "numeric" },
  { label: "Buying Price", key: "buyingPrice", keyboardType: "numeric" },
  { label: "Category", key: "category" },
];

const RANKED_MODE_KEYS = INVENTORY_MODE_RANK_GROUPS.flat();

function formatMode(mode: InventoryItem["mode"]) {
  return RANKED_MODE_KEYS.map((name) =>
    mode[name] !== undefined ? `${name}: ${mode[name]}` : ""
  )
    .filter(Boolean)
    .join(", ");
}

function modeToForm(mode: InventoryMode) {
  return RANKED_MODE_KEYS.reduce<Partial<Record<InventoryModeKey, string>>>(
    (formMode, key) => {
      if (mode[key] !== undefined) {
        formMode[key] = String(mode[key]);
      }
      return formMode;
    },
    {}
  );
}

function formToMode(modeForm: Partial<Record<InventoryModeKey, string>>) {
  return RANKED_MODE_KEYS.reduce<InventoryMode>((mode, key) => {
    const value = modeForm[key]?.trim();

    if (!value) {
      return mode;
    }

    const amount = Number(value);

    if (!Number.isNaN(amount)) {
      mode[key] = amount;
    }

    return mode;
  }, {});
}

function convertPriceForDefaultMode(
  price: string,
  modeForm: Partial<Record<InventoryModeKey, string>>,
  previousDefaultMode: InventoryModeKey,
  nextDefaultMode: InventoryModeKey
) {
  const convertedPrice = getInventoryModePrice(
    price,
    modeForm,
    previousDefaultMode,
    nextDefaultMode
  );

  return convertedPrice ? String(convertedPrice) : price;
}

function getFirstSelectedMode(modeForm: Partial<Record<InventoryModeKey, string>>) {
  return RANKED_MODE_KEYS.find((key) => hasSelectedMode(modeForm, key));
}

function getSelectedModeKeys(modeForm: Partial<Record<InventoryModeKey, string>>) {
  return RANKED_MODE_KEYS.filter((key) => hasSelectedMode(modeForm, key));
}

function getInvalidModeValue(modeForm: Partial<Record<InventoryModeKey, string>>) {
  return getSelectedModeKeys(modeForm).find((key) => {
    const value = modeForm[key]?.trim();
    const amount = Number(value);

    return !value || Number.isNaN(amount) || amount <= 0;
  });
}

function hasSelectedMode(
  modeForm: Partial<Record<InventoryModeKey, string>>,
  key: InventoryModeKey
) {
  return modeForm[key] !== undefined;
}

export default function Inventory() {
  const { colors } = useAppTheme();
  const [data, setData] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] =
    useState<InventoryItem | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<InventoryForm>(emptyForm);

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError("");
      const items = await getInventoryItems();
      setData(items);
    } catch {
      setError("Could not load inventory from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredData = data.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Missing item name", "Please enter an item name.");
      return;
    }

    const firstSelectedMode = getFirstSelectedMode(form.mode);

    if (!firstSelectedMode) {
      Alert.alert("Missing mode", "Please choose at least one mode.");
      return;
    }

    if (!hasSelectedMode(form.mode, form.defaultMode)) {
      Alert.alert("Missing default mode", "Please choose a selected mode as default.");
      return;
    }

    const invalidModeValue = getInvalidModeValue(form.mode);

    if (invalidModeValue) {
      Alert.alert(
        "Missing mode value",
        `Please enter a positive value for ${invalidModeValue}.`
      );
      return;
    }

    const modePayload = formToMode(form.mode);

    try {
      setSaving(true);

      if (editingItem) {
        const updatedItem = await updateInventoryItem(editingItem.id, {
          ...form,
          mode: modePayload,
        });
        setData((prev) =>
          prev.map((item) => (item.id === editingItem.id ? updatedItem : item))
        );
      } else {
        const createdItem = await createInventoryItem({
          ...form,
          mode: modePayload,
        });
        setData((prev) => [createdItem, ...prev]);
      }

      setForm(emptyForm);
      setEditingItem(null);
      setModalVisible(false);
    } catch {
      Alert.alert("Save failed", "Could not save the inventory item.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteInventoryItem(id);
      setData((prev) => prev.filter((item) => item.id !== id));
      setPendingDeleteItem(null);
      setSuccessMessage("Inventory item deleted.");
    } catch {
      Alert.alert("Delete failed", "Could not delete the inventory item.");
    }
  };

  const handleDelete = (item: InventoryItem) => {
    setPendingDeleteItem(item);
  };

  const handleEdit = (item: InventoryItem) => {
    setForm({
      name: item.name,
      sellingPrice: item.sellingPrice,
      buyingPrice: item.buyingPrice,
      category: item.category,
      weight: item.weight,
      mode: modeToForm(item.mode),
      defaultMode: item.defaultMode,
    });
    setEditingItem(item);
    setModalVisible(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.category, { color: colors.textMuted }]} numberOfLines={1}>
          {[item.category, item.weight].filter(Boolean).join(" - ")}
        </Text>
      </View>

      <View style={styles.details}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Buying</Text>
          <Text style={styles.buy}>Rs {item.buyingPrice}</Text>
        </View>

        <View>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Selling</Text>
          <Text style={styles.sell}>Rs {item.sellingPrice}</Text>
        </View>

        {Object.keys(item.mode).length > 0 ? (
          <>
            <Text style={[styles.mode, { color: colors.textMuted }]} numberOfLines={3}>
              {formatMode(item.mode)}
            </Text>
            <Text style={[styles.mode, { color: colors.textMuted }]} numberOfLines={1}>
              Default: {item.defaultMode}
            </Text>
          </>
        ) : null}
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.delete}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Inventory</Text>

      <View>
        <Icon
          name="search"
          size={16}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={[
            styles.search,
            {
              backgroundColor: colors.input,
              color: colors.text,
            },
          ]}
        />
      </View>

      <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.navActive }]} onPress={openCreateModal}>
        <Text style={{ color: colors.nav, fontFamily: "Nippo-Medium", fontWeight: "400" }}>+ Add Item</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#f1e5ac" style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadInventory}>
            <Text style={{ color: "#231512", fontFamily: "Nippo-Medium" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No inventory items found.</Text>
          }
        />
      )}

      {successMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{successMessage}</Text>
          <TouchableOpacity onPress={() => setSuccessMessage("")}>
            <Text style={styles.toastDismiss}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
        >
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {editingItem ? "Edit Item" : "Add Item"}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              {formFields.map((field) => (
                <TextInput
                  key={field.key}
                  placeholder={field.label}
                  placeholderTextColor="#999"
                  value={form[field.key]}
                  onChangeText={(text) =>
                    setForm((prev) => ({ ...prev, [field.key]: text }))
                  }
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  keyboardType={field.keyboardType || "default"}
                />
              ))}

              <Text style={[styles.modeTitle, { color: colors.text }]}>
                Mode
              </Text>
              <View style={styles.modeKeyGrid}>
                {INVENTORY_MODE_RANK_GROUPS.map((rankGroup, rankIndex) => (
                  <View key={rankIndex} style={styles.modeRankGroup}>
                    {rankGroup.map((modeKey) => (
                      <TouchableOpacity
                        key={modeKey}
                        style={[
                          styles.modeKeyBtn,
                          {
                            backgroundColor: hasSelectedMode(form.mode, modeKey)
                              ? colors.navActive
                              : colors.surfaceMuted,
                          },
                        ]}
                        onPress={() =>
                          setForm((prev) => {
                            const nextMode = { ...prev.mode };

                            if (hasSelectedMode(nextMode, modeKey)) {
                              delete nextMode[modeKey];
                            } else {
                              getInventoryModeRankGroup(modeKey).forEach(
                                (groupModeKey) => {
                                  delete nextMode[groupModeKey];
                                }
                              );
                              nextMode[modeKey] = "";
                            }

                            const hasLooseMode = hasSelectedMode(nextMode, "Loose");
                            const nextDefaultMode = hasSelectedMode(
                              nextMode,
                              prev.defaultMode
                            )
                              ? prev.defaultMode
                              : getFirstSelectedMode(nextMode) || modeKey;

                            const defaultModeChanged =
                              nextDefaultMode !== prev.defaultMode;

                            return {
                              ...prev,
                              mode: nextMode,
                              buyingPrice: defaultModeChanged
                                ? convertPriceForDefaultMode(
                                    prev.buyingPrice,
                                    prev.mode,
                                    prev.defaultMode,
                                    nextDefaultMode
                                  )
                                : prev.buyingPrice,
                              sellingPrice: defaultModeChanged
                                ? convertPriceForDefaultMode(
                                    prev.sellingPrice,
                                    prev.mode,
                                    prev.defaultMode,
                                    nextDefaultMode
                                  )
                                : prev.sellingPrice,
                              defaultMode: nextDefaultMode,
                              weight: hasLooseMode ? prev.weight : "",
                            };
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.modeKeyText,
                            {
                              color:
                                hasSelectedMode(form.mode, modeKey) &&
                                colors.navActive === colors.accent
                                  ? "#231512"
                                  : hasSelectedMode(form.mode, modeKey)
                                  ? colors.accent
                                  : colors.text,
                            },
                          ]}
                        >
                          {modeKey}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>

              {hasSelectedMode(form.mode, "Loose") ? (
                <TextInput
                  placeholder="Weight"
                  placeholderTextColor="#999"
                  value={form.weight}
                  onChangeText={(text) =>
                    setForm((prev) => ({ ...prev, weight: text }))
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
              ) : null}

              {getFirstSelectedMode(form.mode) ? (
                <>
                  <Text style={[styles.modeTitle, { color: colors.text }]}>
                    Default Mode
                  </Text>
                  <View style={styles.modeKeyGrid}>
                    {getSelectedModeKeys(form.mode).map((modeKey) => (
                      <TouchableOpacity
                        key={modeKey}
                        style={[
                          styles.modeKeyBtn,
                          {
                            backgroundColor:
                              form.defaultMode === modeKey
                                ? colors.navActive
                                : colors.surfaceMuted,
                          },
                        ]}
                        onPress={() =>
                          setForm((prev) => ({
                            ...prev,
                            buyingPrice: convertPriceForDefaultMode(
                              prev.buyingPrice,
                              prev.mode,
                              prev.defaultMode,
                              modeKey
                            ),
                            sellingPrice: convertPriceForDefaultMode(
                              prev.sellingPrice,
                              prev.mode,
                              prev.defaultMode,
                              modeKey
                            ),
                            defaultMode: modeKey,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.modeKeyText,
                            {
                              color:
                                form.defaultMode === modeKey &&
                                colors.navActive === colors.accent
                                  ? "#231512"
                                  : form.defaultMode === modeKey
                                  ? colors.accent
                                  : colors.text,
                            },
                          ]}
                        >
                          {modeKey}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.modeGrid}>
                {getSelectedModeKeys(form.mode).map((modeKey) => (
                  <View key={modeKey} style={styles.modeInputWrap}>
                    <Text style={[styles.modeLabel, { color: colors.textMuted }]}>
                      {modeKey}
                    </Text>
                    <TextInput
                      placeholder="Value"
                      placeholderTextColor="#999"
                      value={form.mode[modeKey] || ""}
                      onChangeText={(text) =>
                        setForm((prev) => ({
                          ...prev,
                          mode: {
                            ...prev.mode,
                            [modeKey]: text,
                          },
                        }))
                      }
                      style={[
                        styles.input,
                        styles.modeInput,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={{ color: "#231512", fontFamily: "Nippo-Medium" }}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.saveBtn}
              >
                <Text style={{ color: "#231512", fontFamily: "Nippo-Medium" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(pendingDeleteItem)}
        animationType="fade"
        transparent
      >
        <View style={[styles.confirmOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete item?</Text>
            <Text style={[styles.confirmText, { color: colors.textMuted }]}>
              This will permanently delete "{pendingDeleteItem?.name}" from
              inventory.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelDeleteBtn}
                onPress={() => setPendingDeleteItem(null)}
              >
                <Text style={[styles.cancelDeleteText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() =>
                  pendingDeleteItem ? deleteItem(pendingDeleteItem.id) : null
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
  container: { flex: 1, padding: 12, backgroundColor: "#f5f6fa" },

  screenTitle: {
    fontFamily: "Nippo-Medium",
    fontSize: 24,
    fontWeight: "400",
    marginBottom: 12,
  },

  searchIcon: {
    position: "absolute",
    top: 12,
    left: 10,
    zIndex: 1,
  },

  search: {
    fontFamily: "Nippo-Medium",
    height: 45,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 30,
    marginBottom: 10,
  },

  addBtn: {
    backgroundColor: "#f1e5ac",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    minHeight: 250,
    width: "48%",
    justifyContent: "space-between",
  },

  name: { fontFamily: "Nippo-Medium", fontWeight: "400", fontSize: 15, lineHeight: 20 },
  category: { fontFamily: "Nippo-Medium", fontSize: 11, color: "#888", marginTop: 4 },
  mode: { fontFamily: "Nippo-Medium", fontSize: 11, color: "#555", lineHeight: 16, marginTop: 12 },

  details: {
    gap: 10,
    marginVertical: 14,
  },

  priceLabel: {
    fontFamily: "Nippo-Medium",
    color: "#999",
    fontSize: 10,
    marginBottom: 2,
  },

  row: { flexDirection: "row", justifyContent: "space-between" },

  buy: { color: "#e74c3c", fontFamily: "Nippo-Medium", fontWeight: "400" },
  sell: { color: "#27ae60", fontFamily: "Nippo-Medium", fontWeight: "400" },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },

  actionBtn: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 8,
  },

  editBtn: {
    backgroundColor: "#8a6200",
    marginRight: 6,
  },

  deleteBtn: {
    backgroundColor: "#c0392b",
    marginLeft: 6,
  },

  edit: { color: "#fff", fontFamily: "Nippo-Medium", fontWeight: "400" },
  delete: { color: "#fff", fontFamily: "Nippo-Medium", fontWeight: "400" },

  emptyState: {
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 20,
  },

  emptyText: {
    fontFamily: "Nippo-Medium",
    color: "#777",
    textAlign: "center",
    marginTop: 24,
  },

  errorText: {
    fontFamily: "Nippo-Medium",
    color: "#e74c3c",
    textAlign: "center",
  },

  retryBtn: {
    backgroundColor: "#f1e5ac",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  toast: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 135,
    backgroundColor: "#111",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  toastText: {
    fontFamily: "Nippo-Medium",
    color: "#fff",
    fontWeight: "400",
  },

  toastDismiss: {
    fontFamily: "Nippo-Medium",
    color: "#f1e5ac",
    fontWeight: "400",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },

  modal: {
    padding: 20,
    position: "absolute",
    bottom: "10%",
    left: "8%",
    height: 400,
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 12,
    justifyContent: "center",
  },

  title: {
    fontFamily: "Nippo-Medium",
    fontSize: 18,
    fontWeight: "400",
    marginBottom: 20,
  },

  input: {
    fontFamily: "Nippo-Medium",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },

  modeTitle: {
    fontFamily: "Nippo-Medium",
    fontSize: 14,
    fontWeight: "400",
    marginBottom: 8,
    marginTop: 4,
  },

  modeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  modeKeyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  modeRankGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
    width: "100%",
  },

  modeKeyBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  modeKeyText: {
    fontFamily: "Nippo-Medium",
    fontSize: 12,
    fontWeight: "400",
  },

  modeInputWrap: {
    width: "48%",
  },

  modeLabel: {
    fontFamily: "Nippo-Medium",
    fontSize: 11,
    marginBottom: 4,
  },

  modeInput: {
    height: 40,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  saveBtn: {
    backgroundColor: "#f1e5ac",
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  disabledBtn: {
    opacity: 0.7,
  },

  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  confirmBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
  },

  confirmTitle: {
    fontFamily: "Nippo-Medium",
    color: "#231512",
    fontSize: 18,
    fontWeight: "400",
    marginBottom: 8,
  },

  confirmText: {
    fontFamily: "Nippo-Medium",
    color: "#555",
    fontSize: 14,
    lineHeight: 20,
  },

  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },

  cancelDeleteBtn: {
    borderColor: "#ddd",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  cancelDeleteText: {
    fontFamily: "Nippo-Medium",
    color: "#333",
    fontWeight: "400",
  },

  confirmDeleteBtn: {
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  confirmDeleteText: {
    fontFamily: "Nippo-Medium",
    color: "#fff",
    fontWeight: "400",
  },
});
