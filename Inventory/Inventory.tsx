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
  const [data, setData] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
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

  const handleDelete = async (id: string) => {
    try {
      await deleteInventoryItem(id);
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (deleteError) {
      Alert.alert("Delete failed", "Could not delete the inventory item.");
    }
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
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.category}>{item.category}</Text>

      <View style={styles.row}>
        <Text style={styles.buy}>Rs {item.buyingPrice}</Text>
        <Text style={styles.sell}>Rs {item.sellingPrice}</Text>
      </View>

      {item.mode.length > 0 ? (
        <Text style={styles.mode}>{formatMode(item.mode)}</Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEdit(item)}>
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Text style={styles.delete}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
          style={styles.search}
        />
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>+ Add Item</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#fcc01e" style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadInventory}>
            <Text style={{ color: "#000" }}>Retry</Text>
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
            <Text style={styles.emptyText}>No inventory items found.</Text>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.overlay}
        >
          <View style={styles.modal}>
            <Text style={styles.title}>
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
                style={styles.input}
                keyboardType={field.keyboardType || "default"}
              />
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={{ color: "#000" }}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.saveBtn}
              >
                <Text style={{ color: "#000" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    marginBottom: 12,
    width: "48%",
  },

  name: { fontWeight: "bold" },
  category: { fontSize: 11, color: "#888" },
  mode: { fontSize: 11, color: "#555", marginTop: 6 },

  row: { flexDirection: "row", justifyContent: "space-between" },

  buy: { color: "#e74c3c" },
  sell: { color: "#27ae60" },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  edit: { color: "#fcc01e" },
  delete: { color: "red" },

  emptyState: {
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 20,
  },

  emptyText: {
    color: "#777",
    textAlign: "center",
    marginTop: 24,
  },

  errorText: {
    color: "#e74c3c",
    textAlign: "center",
  },

  retryBtn: {
    backgroundColor: "#fcc01e",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },

  input: {
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
});
