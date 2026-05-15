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
import {
  getInventoryItems,
  getInventoryModePrice,
  INVENTORY_MODE_KEYS,
  InventoryItem,
  InventoryMode,
  InventoryModeKey,
} from "../services/inventoryApi";
import {
  createOrder,
  deleteOrder,
  getOrders,
  Order,
  OrderItem,
  updateOrder,
} from "../services/ordersApi";
import {
  getOrderSlipDownloadUrl,
  getOrderSlipFileName,
  getOrderSlipUrl,
} from "../services/orderSlipApi";
import { downloadAndOpenPdf } from "../services/pdfDownloadApi";
import { useAppTheme } from "../theme/ThemeContext";

type OrderLine = {
  id: string;
  itemId: string;
  itemName: string;
  mode: InventoryModeKey;
  quantity: number;
  price: number;
};

function isInventoryModeKey(name: string): name is InventoryModeKey {
  return INVENTORY_MODE_KEYS.includes(name as InventoryModeKey);
}

function getModeEntries(mode: InventoryItem["mode"] | InventoryMode) {
  const modeMap = Array.isArray(mode) ? Object.assign({}, ...mode) : mode;

  return Object.entries(modeMap).filter(
    (entry): entry is [InventoryModeKey, number] =>
      isInventoryModeKey(entry[0]) && typeof entry[1] === "number"
  ).sort(
    ([leftMode], [rightMode]) =>
      INVENTORY_MODE_KEYS.indexOf(leftMode) -
      INVENTORY_MODE_KEYS.indexOf(rightMode)
  );
}

function formatOrderMode(mode: InventoryModeKey) {
  return mode;
}

function getOrderItemKey(itemId: string, mode: InventoryModeKey) {
  return `${itemId}::${mode}`;
}

function getModePrice(
  basePrice: string,
  mode: InventoryMode,
  defaultMode: InventoryModeKey,
  selectedMode: InventoryModeKey
) {
  return getInventoryModePrice(basePrice, mode, defaultMode, selectedMode);
}

function groupOrderItems<T extends OrderItem>(items: T[]) {
  return items.reduce<OrderItem[]>((groupedItems, item) => {
    const existingItem = groupedItems.find(
      (groupedItem) =>
        getOrderItemKey(groupedItem.itemId, groupedItem.mode) ===
        getOrderItemKey(item.itemId, item.mode)
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
      return groupedItems;
    }

    groupedItems.push({ ...item });
    return groupedItems;
  }, []);
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
  const [selectedOrderMode, setSelectedOrderMode] =
    useState<InventoryModeKey | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [slipOrder, setSlipOrder] = useState<Order | null>(null);
  const [openingSlipOrderId, setOpeningSlipOrderId] = useState("");
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState("");
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

  const selectedItemModeNames = selectedItem
    ? getModeEntries(selectedItem.mode).map(([name]) => name)
    : [];
  const selectedBasePrice = selectedItem
    ? orderType === "Customer"
      ? selectedItem.sellingPrice
      : selectedItem.buyingPrice
    : "0";
  const selectedPrice =
    selectedItem && selectedOrderMode
      ? getModePrice(
          selectedBasePrice,
          selectedItem.mode,
          selectedItem.defaultMode,
          selectedOrderMode
        )
      : 0;
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
    setSelectedItem(item);
    setSelectedOrderMode(item.defaultMode);
    setPickerVisible(false);
  };

  const handleQuantityChange = (nextQuantity: number) => {
    setQuantity(String(Math.max(1, nextQuantity)));
  };

  const addLine = () => {
    if (!selectedItem || !selectedOrderMode) {
      Alert.alert("Select item", "Please select an item for the order.");
      return;
    }

    const orderMode = selectedOrderMode;

    setOrderLines((prev) => {
      const existingLine = prev.find(
        (line) =>
          getOrderItemKey(line.itemId, line.mode) ===
          getOrderItemKey(selectedItem.id, orderMode)
      );

      if (existingLine) {
        return prev.map((line) =>
          line.id === existingLine.id
            ? {
                ...line,
                quantity: line.quantity + selectedQuantity,
                price: selectedPrice,
              }
            : line
        );
      }

      return [
        ...prev,
        {
          id: `${selectedItem.id}-${Date.now()}`,
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          mode: orderMode,
          quantity: selectedQuantity,
          price: selectedPrice,
        },
      ];
    });

    setSelectedItem(null);
    setSelectedOrderMode(null);
    setQuantity("1");
  };

  const removeLine = (lineId: string) => {
    setOrderLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const editLine = (line: OrderLine) => {
    const inventoryItem = inventory.find((item) => item.id === line.itemId);

    if (!inventoryItem) {
      Alert.alert(
        "Item unavailable",
        "This item is not available in inventory anymore."
      );
      return;
    }

    setSelectedItem(inventoryItem);
    setSelectedOrderMode(line.mode);
    setQuantity(String(line.quantity));
    removeLine(line.id);
  };

  const resetOrderForm = () => {
    setOrderLines([]);
    setVendorName("");
    setOrderType("Shop");
    setSelectedItem(null);
    setSelectedOrderMode(null);
    setQuantity("1");
    setEditingOrder(null);
  };

  const startEditingOrder = (order: Order) => {
    setEditingOrder(order);
    setVendorName(order.vendor);
    setOrderType(order.type === "Customer" ? "Customer" : "Shop");
    setOrderLines(
      groupOrderItems(order.items).map((item, index) => ({
        id: `${item.itemId}-${index}-${Date.now()}`,
        itemId: item.itemId,
        itemName: item.itemName,
        mode: item.mode,
        quantity: item.quantity,
        price: item.price,
      }))
    );
    setSelectedItem(null);
    setSelectedOrderMode(null);
    setQuantity("1");
    setActiveView("new");
    setSuccessMessage("");
  };

  const cancelEditingOrder = () => {
    resetOrderForm();
  };

  const completeOrder = async () => {
    if (!orderLines.length) {
      Alert.alert("Empty order", "Add at least one item before completing.");
      return;
    }

    if (!vendorName.trim()) {
      Alert.alert("Missing vendor", "Please enter a vendor name.");
      return;
    }

    try {
      setSaving(true);
      const orderPayload = {
        items: orderLines.map(({ id: _id, ...line }) => line),
        estimatedTotal: orderTotal,
        vendor: vendorName.trim(),
        status: editingOrder?.status || "Pending",
        type: orderType,
      };

      if (editingOrder) {
        const updatedOrder = await updateOrder(editingOrder.mongoId, orderPayload);
        setOrders((prev) =>
          prev.map((order) =>
            order.mongoId === updatedOrder.mongoId ? updatedOrder : order
          )
        );
        setSuccessMessage("Order updated.");
      } else {
        const createdOrder = await createOrder(orderPayload);
        setOrders((prev) => [createdOrder, ...prev]);
        setSuccessMessage("Order created.");
      }

      resetOrderForm();
    } catch(e) {
      console.error(e);
      Alert.alert("Save failed", "Could not save the order.");
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

  const isCompleteStatus = (status: string) =>
    ["complete", "completed"].includes(status.toLowerCase());

  const toggleOrderStatus = async (order: Order) => {
    const nextStatus = isCompleteStatus(order.status) ? "Pending" : "Complete";

    try {
      setStatusUpdatingOrderId(order.mongoId);
      const updatedOrder = await updateOrder(order.mongoId, {
        status: nextStatus,
      });
      setOrders((prev) =>
        prev.map((item) =>
          item.mongoId === updatedOrder.mongoId ? updatedOrder : item
        )
      );
      setSuccessMessage(`Order marked ${nextStatus}.`);
    } catch {
      Alert.alert("Update failed", "Could not update the order status.");
    } finally {
      setStatusUpdatingOrderId("");
    }
  };

  const formatDate = (value: string) => {
    if (!value) {
      return "No date";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const formatSlipDate = (value: string) => {
    if (!value) {
      return new Date().toLocaleString();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const openOrderSlip = async (order: Order, download = false) => {
    if (!order.mongoId) {
      Alert.alert("Slip unavailable", "This order does not have an id yet.");
      return;
    }

    try {
      setOpeningSlipOrderId(order.mongoId);
      const slipUrl = download
        ? getOrderSlipDownloadUrl(order.mongoId)
        : getOrderSlipUrl(order.mongoId);
      await downloadAndOpenPdf(
        slipUrl,
        getOrderSlipFileName(order.mongoId),
      );
      setSuccessMessage("Order slip downloaded.");
    } catch {
      Alert.alert("Slip failed", "Could not open the order slip PDF.");
    } finally {
      setOpeningSlipOrderId("");
    }
  };

  const renderOrderSlip = () => {
    if (!slipOrder) {
      return null;
    }

    const slipItems = groupOrderItems(slipOrder.items);

    return (
      <Modal visible={Boolean(slipOrder)} animationType="slide" transparent>
        <View style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.slipModal, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={[styles.slipStoreName, { color: colors.text }]}>
                  MyStore
                </Text>
                <Text style={[styles.slipMeta, { color: colors.textMuted }]}>
                  Order Slip
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSlipOrder(null)}>
                <Text style={styles.closePicker}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.slipInfo, { borderColor: colors.border }]}>
              <View>
                <Text style={[styles.slipLabel, { color: colors.textMuted }]}>
                  Bill to
                </Text>
                <Text style={[styles.slipValue, { color: colors.text }]}>
                  {slipOrder.vendor || "Customer"}
                </Text>
              </View>
              <View style={styles.slipRightInfo}>
                <Text style={[styles.slipLabel, { color: colors.textMuted }]}>
                  Date
                </Text>
                <Text style={[styles.slipValue, { color: colors.text }]}>
                  {formatSlipDate(slipOrder.createdAt)}
                </Text>
              </View>
            </View>

            <ScrollView>
              {slipItems.map((item, index) => (
                <View
                  key={`${slipOrder.mongoId}-slip-${item.itemId}-${item.mode}-${index}`}
                  style={[styles.slipLine, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.lineInfo}>
                    <Text style={[styles.lineName, { color: colors.text }]}>
                      {item.itemName}
                    </Text>
                    <Text style={[styles.lineMeta, { color: colors.textMuted }]}>
                      {item.quantity} x Rs {item.price}
                      {item.mode ? ` - ${formatOrderMode(item.mode)}` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.lineTotal, { color: colors.text }]}>
                    Rs {item.quantity * item.price}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.slipTotalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={styles.totalValue}>Rs {slipOrder.estimatedTotal}</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
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
                  <View style={styles.historyTitleWrap}>
                    <Text
                      style={[styles.historyTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {order.vendor || order.type || "Order"}
                    </Text>
                    <Text
                      style={[styles.historyText, { color: colors.textMuted }]}
                    >
                      {order.type ? `${order.type} - ` : ""}
                      {formatDate(order.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.historyRight}>
                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        isCompleteStatus(order.status)
                          ? styles.statusComplete
                          : styles.statusPending,
                        statusUpdatingOrderId === order.mongoId &&
                          styles.disabledBtn,
                      ]}
                      onPress={() => toggleOrderStatus(order)}
                      disabled={statusUpdatingOrderId === order.mongoId}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isCompleteStatus(order.status)
                              ? "#fff"
                              : "#000",
                          },
                        ]}
                      >
                        {statusUpdatingOrderId === order.mongoId
                          ? "Updating..."
                          : isCompleteStatus(order.status)
                          ? "Complete"
                          : "Pending"}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.historyActions}>
                      <TouchableOpacity
                        onPress={() => openOrderSlip(order)}
                        disabled={openingSlipOrderId === order.mongoId}
                      >
                        <Text style={styles.historyActionSlip}>
                          {openingSlipOrderId === order.mongoId
                            ? "Opening..."
                            : "Slip"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setSlipOrder(order)}
                      >
                        <Text style={styles.historyActionPreview}>Preview</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => startEditingOrder(order)}>
                        <Text style={styles.historyActionEdit}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeOrder(order)}>
                        <Text style={styles.historyActionDelete}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {groupOrderItems(order.items).map((item, index) => (
                  <View
                    key={`${order.mongoId}-${item.itemId}-${index}`}
                    style={[styles.historyLine, { borderTopColor: colors.border }]}
                  >
                    <View style={styles.historyLineInfo}>
                      <Text
                        style={[styles.lineName, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {item.itemName}
                      </Text>
                      <Text style={[styles.lineMeta, { color: colors.textMuted }]}>
                        {item.quantity} x Rs {item.price}
                        {item.mode ? ` - ${formatOrderMode(item.mode)}` : ""}
                      </Text>
                    </View>
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
            {editingOrder ? (
              <View style={styles.editingBanner}>
                <View>
                  <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>
                    Editing order
                  </Text>
                  <Text style={[styles.lineName, { color: colors.text }]} numberOfLines={1}>
                    {editingOrder.vendor || editingOrder.type || "Order"}
                  </Text>
                </View>
                <TouchableOpacity onPress={cancelEditingOrder}>
                  <Text style={styles.removeLine}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : null}

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

            {selectedItem && selectedItemModeNames.length > 0 ? (
              <View style={styles.modeDisplayGrid}>
                {getModeEntries(selectedItem.mode).map(([modeName, value]) => (
                  <TouchableOpacity
                    key={modeName}
                    style={[
                      styles.modeDisplayChip,
                      {
                        backgroundColor:
                          selectedOrderMode === modeName
                            ? colors.navActive
                            : colors.surfaceMuted,
                      },
                    ]}
                    onPress={() => setSelectedOrderMode(modeName)}
                  >
                    <Text style={[styles.modeDisplayLabel, { color: colors.textMuted }]}>
                      {modeName}
                      {selectedItem.defaultMode === modeName ? " default" : ""}
                    </Text>
                    <Text
                      style={[
                        styles.modeDisplayValue,
                        {
                          color:
                            selectedOrderMode === modeName &&
                            colors.navActive === colors.accent
                              ? "#000"
                              : colors.text,
                        },
                      ]}
                    >
                      {value}
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

            <TouchableOpacity style={[styles.addLineBtn, { backgroundColor: colors.navActive }]} onPress={addLine}>
              <Text style={[styles.addLineText, { color: colors.nav }]}>
                Add to Order
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.summary, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {editingOrder ? "Edit Order" : "Current Order"}
            </Text>

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
                      {line.mode ? ` - ${formatOrderMode(line.mode)}` : ""}
                    </Text>
                  </View>

                  <View style={styles.lineRight}>
                    <Text style={[styles.lineTotal, { color: colors.text }]}>
                      Rs {line.price * line.quantity}
                    </Text>
                    <TouchableOpacity onPress={() => editLine(line)}>
                      <Text style={styles.editLine}>Edit</Text>
                    </TouchableOpacity>
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
                {saving
                  ? "Saving..."
                  : editingOrder
                  ? "Update Order"
                  : "Complete Order"}
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
                    Rs {orderType === "Customer" ? item.sellingPrice : item.buyingPrice}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {renderOrderSlip()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa", padding: 12 },
  title: {
    color: "#000",
    fontFamily: "Nippo-Medium",
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
    fontFamily: "Nippo-Medium",
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
    fontFamily: "Nippo-Medium",
    fontSize: 17,
    marginTop: 12,
  },
  historyText: {
    fontFamily: "Nippo-Medium",
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
    alignItems: "stretch",
    flexDirection: "column",
    gap: 10,
  },
  historyTitleWrap: {
    minWidth: 0,
    width: "100%",
  },
  historyRight: {
    alignItems: "flex-start",
    width: "100%",
  },
  historyActions: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
    marginTop: 8,
    maxWidth: "100%",
  },
  statusBtn: {
    alignItems: "center",
    borderRadius: 8,
    minWidth: 90,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusComplete: {
    backgroundColor: "#27ae60",
  },
  statusPending: {
    backgroundColor: "#fcc01e",
  },
  statusText: {
    fontFamily: "Nippo-Medium",
    fontSize: 12,
    fontWeight: "400",
  },
  historyLine: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 10,
    paddingTop: 10,
  },
  historyLineInfo: {
    minWidth: 0,
    width: "100%",
  },
  panel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  editingBanner: {
    alignItems: "center",
    borderBottomColor: "#f0f0f0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
  },
  input: {
    fontFamily: "Nippo-Medium",
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
    fontFamily: "Nippo-Medium",
    fontSize: 13,
    fontWeight: "400",
  },
  selectorLabel: { color: "#999", fontFamily: "Nippo-Medium", fontSize: 11, marginBottom: 3 },
  selectorValue: { color: "#000", fontFamily: "Nippo-Medium", fontWeight: "400", maxWidth: 240 },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  modeDisplayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  modeDisplayChip: {
    borderRadius: 8,
    minWidth: "30%",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeDisplayLabel: {
    fontFamily: "Nippo-Medium",
    fontSize: 11,
    marginBottom: 3,
  },
  modeDisplayValue: {
    fontFamily: "Nippo-Medium",
    fontSize: 13,
    fontWeight: "400",
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
    fontFamily: "Nippo-Medium",
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
    fontFamily: "Nippo-Medium",
    fontSize: 18,
    fontWeight: "400",
  },
  quantityInput: {
    fontFamily: "Nippo-Medium",
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
  previewLabel: { color: "#777", fontFamily: "Nippo-Medium", fontWeight: "400" },
  previewTotal: { color: "#27ae60", fontFamily: "Nippo-Medium", fontWeight: "400" },
  addLineBtn: {
    backgroundColor: "#040201",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 14,
  },
  addLineText: { color:  "#f1e5ac", fontFamily: "Nippo-Medium", fontWeight: "400" },
  summary: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: {
    color: "#000",
    fontFamily: "Nippo-Medium",
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
  lineName: { color: "#000", fontFamily: "Nippo-Medium", fontWeight: "400" },
  lineMeta: { color: "#777", fontFamily: "Nippo-Medium", fontSize: 12, marginTop: 4 },
  lineRight: { alignItems: "flex-end" },
  lineTotal: { color: "#000", fontFamily: "Nippo-Medium", fontWeight: "400" },
  editLine: { color: "#8a6200", fontFamily: "Nippo-Medium", fontSize: 12 },
  historyActionEdit: { color: "#8a6200", fontFamily: "Nippo-Medium", fontSize: 12 },
  historyActionSlip: { color: "#1877f2", fontFamily: "Nippo-Medium", fontSize: 12 },
  historyActionPreview: { color: "#555", fontFamily: "Nippo-Medium", fontSize: 12 },
  historyActionDelete: { color: "#c0392b", fontFamily: "Nippo-Medium", fontSize: 12 },
  removeLine: { color: "#c0392b", fontFamily: "Nippo-Medium", fontSize: 12, marginTop: 6 },
  emptyText: { color: "#777", fontFamily: "Nippo-Medium", textAlign: "center", paddingVertical: 12 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  totalLabel: { color: "#000", fontFamily: "Nippo-Medium", fontSize: 16, fontWeight: "400" },
  totalValue: { color: "#27ae60", fontFamily: "Nippo-Medium", fontSize: 18, fontWeight: "400" },
  completeBtn: {
    backgroundColor: "#111",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 14,
  },
  completeText: { color: "#fff", fontFamily: "Nippo-Medium", fontWeight: "400" },
  disabledBtn: { opacity: 0.5 },
  emptyState: {
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 20,
  },
  errorText: { color: "#e74c3c", fontFamily: "Nippo-Medium", textAlign: "center" },
  retryBtn: {
    backgroundColor: "#fcc01e",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#000", fontFamily: "Nippo-Medium", fontWeight: "400" },
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
  toastText: { color: "#fff", fontFamily: "Nippo-Medium", fontWeight: "400" },
  toastDismiss: { color: "#fcc01e", fontFamily: "Nippo-Medium", fontWeight: "400" },
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
  pickerTitle: { color: "#000", fontFamily: "Nippo-Medium", fontSize: 18, fontWeight: "400" },
  closePicker: { color: "#8a6200", fontFamily: "Nippo-Medium", fontWeight: "400" },
  searchIcon: {
    position: "absolute",
    top: 12,
    left: 10,
    zIndex: 1,
  },
  search: {
    fontFamily: "Nippo-Medium",
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
  pickerItemName: { color: "#000", fontFamily: "Nippo-Medium", fontWeight: "400" },
  pickerItemCategory: { color: "#888", fontFamily: "Nippo-Medium", fontSize: 12, marginTop: 3 },
  pickerItemPrice: { color: "#27ae60", fontFamily: "Nippo-Medium", fontWeight: "400" },
  slipModal: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: "82%",
    padding: 14,
  },
  slipStoreName: {
    fontFamily: "Nippo-Medium",
    fontSize: 20,
    fontWeight: "400",
  },
  slipMeta: {
    fontFamily: "Nippo-Medium",
    fontSize: 12,
    marginTop: 4,
  },
  slipInfo: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    padding: 10,
  },
  slipRightInfo: {
    alignItems: "flex-end",
    flex: 1,
  },
  slipLabel: {
    fontFamily: "Nippo-Medium",
    fontSize: 11,
    marginBottom: 4,
  },
  slipValue: {
    fontFamily: "Nippo-Medium",
    fontSize: 12,
    fontWeight: "400",
  },
  slipLine: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  slipTotalRow: {
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
  },
});
