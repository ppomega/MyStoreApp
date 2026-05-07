import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  InventoryItem,
  InventoryItemInput,
  updateInventoryItem,
} from "../services/inventoryApi";
import { useAppTheme } from "../theme/ThemeContext";

type InventoryForm = Omit<InventoryItemInput, "mode"> & {
  mode: string;
};

const emptyForm: InventoryForm = {
  name: "",
  sellingPrice: "",
  buyingPrice: "",
  mode: "",
  category: "",
};

const formFields: Array<{
  label: string;
  key: keyof InventoryForm;
  keyboardType?: "default" | "numeric";
}> = [
  { label: "Name", key: "name" },
  { label: "Selling Price", key: "sellingPrice", keyboardType: "numeric" },
  { label: "Buying Price", key: "buyingPrice", keyboardType: "numeric" },
  { label: "Mode (Packet: 1, Ladi: 10)", key: "mode" },
  { label: "Category", key: "category" },
];

function formatMode(mode: InventoryItem["mode"]) {
  return mode
    .map((entry) => {
      const [name, value] = Object.entries(entry)[0] || ["", ""];
      return name ? `${name}: ${value}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function parseMode(modeText: string) {
  return modeText
    .split(",")
    .map((entry) => {
      const [rawName, rawValue] = entry.split(":");
      const name = rawName?.trim();
      const value = Number(rawValue?.trim());

      if (!name || Number.isNaN(value)) {
        return null;
      }

      return { [name]: value };
    })
    .filter((entry): entry is Record<string, number> => Boolean(entry));
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
    } catch (loadError) {
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

    try {
      setSaving(true);

      if (editingItem) {
        const updatedItem = await updateInventoryItem(editingItem.id, {
          ...form,
          mode: parseMode(form.mode),
        });
        setData((prev) =>
          prev.map((item) => (item.id === editingItem.id ? updatedItem : item))
        );
      } else {
        const createdItem = await createInventoryItem({
          ...form,
          mode: parseMode(form.mode),
        });
        setData((prev) => [createdItem, ...prev]);
      }

      setForm(emptyForm);
      setEditingItem(null);
      setModalVisible(false);
    } catch (saveError) {
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
    } catch (deleteError) {
      Alert.alert("Delete failed", "Could not delete the inventory item.");
    }
  };

  const handleDelete = (item: InventoryItem) => {
    setPendingDeleteItem(item);
  };

  const handleEdit = (item: InventoryItem) => {
    const { id, ...itemForm } = item;
    setForm({
      ...itemForm,
      mode: formatMode(item.mode),
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
          {item.category}
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

        {item.mode.length > 0 ? (
          <Text style={[styles.mode, { color: colors.textMuted }]} numberOfLines={3}>
            {formatMode(item.mode)}
          </Text>
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

      <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
        <Text style={{ color: "#fff", fontFamily: "JetBrains", fontWeight: "400" }}>+ Add Item</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#fcc01e" style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadInventory}>
            <Text style={{ color: "#000", fontFamily: "JetBrains" }}>Retry</Text>
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

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={{ color: "#000", fontFamily: "JetBrains" }}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.saveBtn}
              >
                <Text style={{ color: "#000", fontFamily: "JetBrains" }}>Cancel</Text>
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

  searchIcon: {
    position: "absolute",
    top: 12,
    left: 10,
    zIndex: 1,
  },

  search: {
    fontFamily: "JetBrains",
    height: 45,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 30,
    marginBottom: 10,
  },

  addBtn: {
    backgroundColor: "#fcc01e",
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

  name: { fontFamily: "JetBrains", fontWeight: "400", fontSize: 15, lineHeight: 20 },
  category: { fontFamily: "JetBrains", fontSize: 11, color: "#888", marginTop: 4 },
  mode: { fontFamily: "JetBrains", fontSize: 11, color: "#555", lineHeight: 16, marginTop: 12 },

  details: {
    gap: 10,
    marginVertical: 14,
  },

  priceLabel: {
    fontFamily: "JetBrains",
    color: "#999",
    fontSize: 10,
    marginBottom: 2,
  },

  row: { flexDirection: "row", justifyContent: "space-between" },

  buy: { color: "#e74c3c", fontFamily: "JetBrains", fontWeight: "400" },
  sell: { color: "#27ae60", fontFamily: "JetBrains", fontWeight: "400" },

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

  edit: { color: "#fff", fontFamily: "JetBrains", fontWeight: "400" },
  delete: { color: "#fff", fontFamily: "JetBrains", fontWeight: "400" },

  emptyState: {
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 20,
  },

  emptyText: {
    fontFamily: "JetBrains",
    color: "#777",
    textAlign: "center",
    marginTop: 24,
  },

  errorText: {
    fontFamily: "JetBrains",
    color: "#e74c3c",
    textAlign: "center",
  },

  retryBtn: {
    backgroundColor: "#fcc01e",
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
    fontFamily: "JetBrains",
    color: "#fff",
    fontWeight: "400",
  },

  toastDismiss: {
    fontFamily: "JetBrains",
    color: "#fcc01e",
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
    fontFamily: "JetBrains",
    fontSize: 18,
    fontWeight: "400",
    marginBottom: 20,
  },

  input: {
    fontFamily: "JetBrains",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  saveBtn: {
    backgroundColor: "#fcc01e",
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
    fontFamily: "JetBrains",
    color: "#000",
    fontSize: 18,
    fontWeight: "400",
    marginBottom: 8,
  },

  confirmText: {
    fontFamily: "JetBrains",
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
    fontFamily: "JetBrains",
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
    fontFamily: "JetBrains",
    color: "#fff",
    fontWeight: "400",
  },
});
