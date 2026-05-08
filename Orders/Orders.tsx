import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { getInventoryItems, InventoryItem } from "../services/inventoryApi";
import {
  createOrder,
  deleteOrder,
  getOrders,
  Order,
} from "../services/ordersApi";
import { useAppTheme } from "../theme/ThemeContext";

type OrderLine = {
  id: string;
  itemId: string;
  itemName: string;
  mode: string;
  quantity: number;
  price: number;
};

function formatMode(mode: InventoryItem["mode"]) {
  return mode
    .map((entry) => {
      const [name, value] = Object.entries(entry)[0] || ["", ""];
      return name ? `${name}: ${value}` : "";
    })
    .filter(Boolean);
}

function toNumber(value: string) {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

export default function Orders() {
  const { colors } = useAppTheme();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [activeView, setActiveView] = useState<"new" | "history">("new");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");

  const [vendorName, setVendorName] = useState("");
  const [orderType, setOrderType] = useState<"Shop" | "Customer">("Shop");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedMode, setSelectedMode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError("");
      const items = await getInventoryItems();
      setInventory(items);
    } catch {
      setError("Could not load inventory for orders.");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const items = await getOrders();
      setOrders(items);
    } catch {
      setHistoryError("Could not load orders from the server.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    loadOrders();
  }, []);

  const selectedItemModes = selectedItem ? formatMode(selectedItem.mode) : [];
  const selectedPrice = selectedItem ? toNumber(selectedItem.buyingPrice) : 0;
  const selectedQuantity = Math.max(1, Number(quantity) || 1);
  const previewTotal = selectedPrice * selectedQuantity;

  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  const orderTotal = useMemo(
    () =>
      orderLines.reduce(
        (total, line) => total + line.price * line.quantity,
        0
      ),
    [orderLines]
  );

  const handleSelectItem = (item: InventoryItem) => {
    const modes = formatMode(item.mode);
    setSelectedItem(item);
    setSelectedMode(modes[0] || "");
    setPickerVisible(false);
  };

  const handleQuantityChange = (nextQuantity: number) => {
    setQuantity(String(Math.max(1, nextQuantity)));
  };

  const addLine = () => {
    if (!selectedItem) {
      Alert.alert("Select item", "Please select an item for the order.");
      return;
    }

    setOrderLines((prev) => [
      ...prev,
      {
        id: `${selectedItem.id}-${Date.now()}`,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        mode: selectedMode,
        quantity: selectedQuantity,
        price: selectedPrice,
      },
    ]);

    setSelectedItem(null);
    setSelectedMode("");
    setQuantity("1");
  };

  const removeLine = (lineId: string) => {
    setOrderLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const completeOrder = async () => {
    if (!orderLines.length) {
      Alert.alert("Empty order", "Add at least one item before completing.");
      return;
    }

    try {
      setSaving(true);
      const createdOrder = await createOrder({
        items: orderLines.map(({ id: _id, ...line }) => line),
        estimatedTotal: orderTotal,
        status: "Completed",
        type: orderType,
      });

      setOrders((prev) => [createdOrder, ...prev]);
      setOrderLines([]);
      setVendorName("");
      setOrderType("Shop");
      setSuccessMessage("Order created.");
    } catch {
      Alert.alert("Save failed", "Could not create the order.");
    } finally {
      setSaving(false);
    }
  };

  const removeOrder = async (order: Order) => {
    try {
      await deleteOrder(order.mongoId);
      setOrders((prev) =>
        prev.filter((item) => item.mongoId !== order.mongoId)
      );
      setSuccessMessage("Order deleted.");
    } catch {
      Alert.alert("Delete failed", "Could not delete the order.");
    }
  };

  const formatDate = (value: string) => {
    if (!value) {
      return "No date";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Orders</Text>

      <View style={[styles.viewSwitch, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.viewSwitchBtn,
            activeView === "new" && { backgroundColor: colors.navActive },
          ]}
          onPress={() => setActiveView("new")}
        >
          <Text
            style={[
              styles.viewSwitchText,
              {
                color:
                  activeView === "new"
                    ? colors.navActive === colors.accent
                      ? "#000"
                      : "#fff"
                    : colors.text,
              },
            ]}
          >
            New Order
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewSwitchBtn,
            activeView === "history" && { backgroundColor: colors.navActive },
          ]}
          onPress={() => setActiveView("history")}
        >
          <Text
            style={[
              styles.viewSwitchText,
              {
                color:
                  activeView === "history"
                    ? colors.navActive === colors.accent
                      ? "#000"
                      : "#fff"
                    : colors.text,
              },
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeView === "history" ? (
        <ScrollView contentContainerStyle={styles.content}>
          {historyLoading ? (
            <ActivityIndicator color="#fcc01e" style={{ marginTop: 24 }} />
          ) : historyError ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{historyError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadOrders}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : orders.length ? (
            orders.map((order) => (
              <View
                key={order.mongoId}
                style={[styles.historyCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.historyCardHeader}>
                  <View>
                    <Text style={[styles.historyTitle, { color: colors.text }]}>
                      {order.type || "Order"}
                    </Text>
                    <Text style={[styles.historyText, { color: colors.textMuted }]}>
                      {formatDate(order.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={styles.statusText}>
                      {order.status || "Pending"}
                    </Text>
                    <TouchableOpacity onPress={() => removeOrder(order)}>
                      <Text style={styles.removeLine}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {order.items.map((item, index) => (
                  <View
                    key={`${order.mongoId}-${item.itemId}-${index}`}
                    style={[styles.historyLine, { borderTopColor: colors.border }]}
                  >
                    <Text
                      style={[styles.lineName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.itemName}
                    </Text>
                    <Text style={[styles.lineMeta, { color: colors.textMuted }]}>
                      {item.quantity} x Rs {item.price}
                      {item.mode ? ` - ${item.mode}` : ""}
                    </Text>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>
                    Total
                  </Text>
                  <Text style={styles.totalValue}>
                    Rs {order.estimatedTotal}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.historyPanel, { backgroundColor: colors.surface }]}>
              <Icon name="history" size={26} color={colors.accent} />
              <Text style={[styles.historyTitle, { color: colors.text }]}>
                No past orders yet
              </Text>
              <Text style={[styles.historyText, { color: colors.textMuted }]}>
                Completed orders will appear here once they are created.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : loading ? (
        <ActivityIndicator color="#fcc01e" style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadInventory}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.panel, { backgroundColor: colors.surface }]}>
            <TextInput
              placeholder="Vendor name"
              placeholderTextColor="#999"
              value={vendorName}
              onChangeText={setVendorName}
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />

            <View style={styles.typeRow}>
              {(["Shop", "Customer"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor:
                        orderType === type ? colors.navActive : colors.surfaceMuted,
                    },
                  ]}
                  onPress={() => setOrderType(type)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      {
                        color:
                          orderType === type && colors.navActive === colors.accent
                            ? "#000"
                            : orderType === type
                            ? colors.accent
                            : colors.text,
                      },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.itemSelector, { borderColor: colors.border }]}
              onPress={() => setPickerVisible(true)}
            >
              <View>
                <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>Item</Text>
                <Text style={[styles.selectorValue, { color: colors.text }]} numberOfLines={1}>
                  {selectedItem ? selectedItem.name : "Select inventory item"}
                </Text>
              </View>
              <Icon name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            {selectedItemModes.length > 0 ? (
              <View style={styles.modeRow}>
                {selectedItemModes.map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeChip,
                      selectedMode === mode && styles.modeChipActive,
                      {
                        backgroundColor:
                          selectedMode === mode
                            ? colors.navActive
                            : colors.surfaceMuted,
                      },
                    ]}
                    onPress={() => setSelectedMode(mode)}
                  >
                    <Text
                      style={[
                        styles.modeChipText,
                        selectedMode === mode && styles.modeChipTextActive,
                        {
                          color:
                            selectedMode === mode &&
                            colors.navActive === colors.accent
                              ? "#000"
                              : selectedMode === mode
                              ? colors.accent
                              : colors.text,
                        },
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => handleQuantityChange(selectedQuantity - 1)}
              >
                <Text style={styles.quantityBtnText}>-</Text>
              </TouchableOpacity>

              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                style={[
                  styles.quantityInput,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => handleQuantityChange(selectedQuantity + 1)}
              >
                <Text style={styles.quantityBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Line total</Text>
              <Text style={styles.previewTotal}>Rs {previewTotal}</Text>
            </View>

            <TouchableOpacity style={styles.addLineBtn} onPress={addLine}>
              <Text style={styles.addLineText}>Add to Order</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.summary, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Order</Text>

            {orderLines.length ? (
              orderLines.map((line) => (
                <View
                  key={line.id}
                  style={[styles.orderLine, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.lineInfo}>
                    <Text style={[styles.lineName, { color: colors.text }]} numberOfLines={1}>
                      {line.itemName}
                    </Text>
                    <Text style={[styles.lineMeta, { color: colors.textMuted }]}>
                      {line.quantity} x Rs {line.price}
                      {line.mode ? ` - ${line.mode}` : ""}
                    </Text>
                  </View>

                  <View style={styles.lineRight}>
                    <Text style={[styles.lineTotal, { color: colors.text }]}>
                      Rs {line.price * line.quantity}
                    </Text>
                    <TouchableOpacity onPress={() => removeLine(line.id)}>
                      <Text style={styles.removeLine}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No items added yet.</Text>
            )}

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={styles.totalValue}>Rs {orderTotal}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.completeBtn,
                (!orderLines.length || saving) && styles.disabledBtn,
              ]}
              onPress={completeOrder}
              disabled={!orderLines.length || saving}
            >
              <Text style={styles.completeText}>
                {saving ? "Saving..." : "Complete Order"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {successMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{successMessage}</Text>
          <TouchableOpacity onPress={() => setSuccessMessage("")}>
            <Text style={styles.toastDismiss}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.picker, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Item</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.closePicker}>Close</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Icon
                name="search"
                size={16}
                color="#999"
                style={styles.searchIcon}
              />
              <TextInput
                placeholder="Search inventory"
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

            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredInventory.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectItem(item)}
                >
                  <View>
                    <Text style={[styles.pickerItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.pickerItemCategory, { color: colors.textMuted }]}>
                      {item.category}
                    </Text>
                  </View>
                  <Text style={styles.pickerItemPrice}>
                    Rs {item.buyingPrice}
                  </Text>
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
  container: { flex: 1, backgroundColor: "#f5f6fa", padding: 12 },
  title: {
    color: "#000",
    fontFamily: "JetBrains",
    fontSize: 24,
    fontWeight: "400",
    marginBottom: 12,
  },
  content: {
    paddingBottom: 130,
  },
  viewSwitch: {
    borderRadius: 10,
    flexDirection: "row",
    marginBottom: 12,
    padding: 4,
  },
  viewSwitchBtn: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  viewSwitchText: {
    fontFamily: "JetBrains",
    fontSize: 13,
  },
  historyPanel: {
    alignItems: "center",
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  historyTitle: {
    fontFamily: "JetBrains",
    fontSize: 17,
    marginTop: 12,
  },
  historyText: {
    fontFamily: "JetBrains",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
  },
  historyCardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  statusText: {
    color: "#27ae60",
    fontFamily: "JetBrains",
    fontSize: 12,
    fontWeight: "400",
  },
  historyLine: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 10,
    paddingTop: 10,
  },
  panel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  input: {
    fontFamily: "JetBrains",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  itemSelector: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  typeBtn: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  typeText: {
    fontFamily: "JetBrains",
    fontSize: 13,
    fontWeight: "400",
  },
  selectorLabel: { color: "#999", fontFamily: "JetBrains", fontSize: 11, marginBottom: 3 },
  selectorValue: { color: "#000", fontFamily: "JetBrains", fontWeight: "400", maxWidth: 240 },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  modeChip: {
    backgroundColor: "#f4f4f4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeChipActive: {
    backgroundColor: "#111",
  },
  modeChipText: {
    color: "#333",
    fontFamily: "JetBrains",
    fontWeight: "400",
  },
  modeChipTextActive: {
    color: "#fcc01e",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  quantityBtn: {
    backgroundColor: "#111",
    borderRadius: 8,
    height: 40,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnText: {
    color: "#fff",
    fontFamily: "JetBrains",
    fontSize: 18,
    fontWeight: "400",
  },
  quantityInput: {
    fontFamily: "JetBrains",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    flex: 1,
    height: 40,
    textAlign: "center",
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  previewLabel: { color: "#777", fontFamily: "JetBrains", fontWeight: "400" },
  previewTotal: { color: "#27ae60", fontFamily: "JetBrains", fontWeight: "400" },
  addLineBtn: {
    backgroundColor: "#fcc01e",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 14,
  },
  addLineText: { color: "#000", fontFamily: "JetBrains", fontWeight: "400" },
  summary: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: {
    color: "#000",
    fontFamily: "JetBrains",
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 10,
  },
  orderLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  lineInfo: { flex: 1, paddingRight: 10 },
  lineName: { color: "#000", fontFamily: "JetBrains", fontWeight: "400" },
  lineMeta: { color: "#777", fontFamily: "JetBrains", fontSize: 12, marginTop: 4 },
  lineRight: { alignItems: "flex-end" },
  lineTotal: { color: "#000", fontFamily: "JetBrains", fontWeight: "400" },
  removeLine: { color: "#c0392b", fontFamily: "JetBrains", fontSize: 12, marginTop: 6 },
  emptyText: { color: "#777", fontFamily: "JetBrains", textAlign: "center", paddingVertical: 12 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  totalLabel: { color: "#000", fontFamily: "JetBrains", fontSize: 16, fontWeight: "400" },
  totalValue: { color: "#27ae60", fontFamily: "JetBrains", fontSize: 18, fontWeight: "400" },
  completeBtn: {
    backgroundColor: "#111",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 14,
  },
  completeText: { color: "#fff", fontFamily: "JetBrains", fontWeight: "400" },
  disabledBtn: { opacity: 0.5 },
  emptyState: {
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 20,
  },
  errorText: { color: "#e74c3c", fontFamily: "JetBrains", textAlign: "center" },
  retryBtn: {
    backgroundColor: "#fcc01e",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#000", fontFamily: "JetBrains", fontWeight: "400" },
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
  toastText: { color: "#fff", fontFamily: "JetBrains", fontWeight: "400" },
  toastDismiss: { color: "#fcc01e", fontFamily: "JetBrains", fontWeight: "400" },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  picker: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: "78%",
    padding: 14,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pickerTitle: { color: "#000", fontFamily: "JetBrains", fontSize: 18, fontWeight: "400" },
  closePicker: { color: "#8a6200", fontFamily: "JetBrains", fontWeight: "400" },
  searchIcon: {
    position: "absolute",
    top: 12,
    left: 10,
    zIndex: 1,
  },
  search: {
    fontFamily: "JetBrains",
    height: 45,
    backgroundColor: "#f5f6fa",
    borderRadius: 10,
    paddingHorizontal: 30,
    marginBottom: 10,
  },
  pickerItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  pickerItemName: { color: "#000", fontFamily: "JetBrains", fontWeight: "400" },
  pickerItemCategory: { color: "#888", fontFamily: "JetBrains", fontSize: 12, marginTop: 3 },
  pickerItemPrice: { color: "#27ae60", fontFamily: "JetBrains", fontWeight: "400" },
});
