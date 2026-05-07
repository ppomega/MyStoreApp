import React, { useState } from "react";
import {
  View,KeyboardAvoidingView,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import  Icon  from "react-native-vector-icons/FontAwesome";

const initialData = [
  {
    id: "1",
    name: "Laptop",
    sellingPrice: "60000",
    buyingPrice: "50000",
    category: "Electronics",
  },
];

export default function Inventory() {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    sellingPrice: "",
    buyingPrice: "",
    category: "",
  });

  const filteredData = data.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  /* ➕ Create / ✏️ Update */
  const handleSave = () => {
    if (!form.name) return;

    if (editingItem) {
      // Update
      setData((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, ...form } : item
        )
      );
    } else {
      // Create
      setData((prev) => [
        ...prev,
        { ...form, id: Date.now().toString() },
      ]);
    }

    setForm({ name: "", sellingPrice: "", buyingPrice: "", category: "" });
    setEditingItem(null);
    setModalVisible(false);
  };

  /* 🗑 Delete */
  const handleDelete = (id: string) => {
    setData((prev) => prev.filter((item) => item.id !== id));
  };

  /* ✏️ Edit */
  const handleEdit = (item: any) => {
    setForm(item);
    setEditingItem(item);
    setModalVisible(true);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.category}>{item.category}</Text>

      <View style={styles.row}>
        <Text style={styles.buy}>₹{item.buyingPrice}</Text>
        <Text style={styles.sell}>₹{item.sellingPrice}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEdit(item)}>
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Text style={styles.delete}>Delete</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 🔍 Search */}
      <View style={{ }}>
      <Icon name="search" size={16} color="#999" style={{ position: "absolute", top: 12, left: 10, zIndex: 1 }} />
      <TextInput
        placeholder="Search"
        placeholderTextColor={"#999"}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
</View>
      {/* ➕ Add Button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          setEditingItem(null);
          setForm({ name: "", sellingPrice: "", buyingPrice: "", category: "" });
          setModalVisible(true);
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>+ Add Item</Text>
      </TouchableOpacity>

      {/* 📦 Grid */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
      />

      {/* 🧾 Modal Form */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView  behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center" }}>
        <View  
      style={styles.modal}>
          <Text style={styles.title}>
            {editingItem ? "Edit Item" : "Add Item"}
          </Text>

          {["Name", "Selling Price", "Buying Price", "Category"].map((field) => (
            <TextInput
              key={field}
              placeholder={field}
              placeholderTextColor={"#999"}
              value={(form as any)[field]}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, [field]: text }))
              }
              style={styles.input}
              keyboardType={
                field.includes("Price") ? "numeric" : "default"
              }
            />
          ))}
<View style={{ flexDirection: "row",  justifyContent: "space-between", height: "10%"  }}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} >
            <Text style={{ color: "#000" }}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.saveBtn}>
            <Text style={{ marginTop: 10 ,color:"#000"}}>Cancel</Text>
          </TouchableOpacity></View>
       </View> </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f5f6fa" },

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
    fontWeight: "light",
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

  modal: {
    // flex: 1,
    padding: 20,
    position: "absolute",
    bottom: "10%",
    left: "8%",
    height:400,
    backgroundColor: "#fff",
    width:"85%",
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

  saveBtn: {
    backgroundColor: "#fcc01e",
    borderRadius: 8,
    alignItems: "center",
    paddingLeft: 16,
  },
});