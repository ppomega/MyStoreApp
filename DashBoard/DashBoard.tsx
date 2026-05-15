import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { getBorrowers, type Borrower } from "../services/borrowersApi";
import {
  getBorrowerDebts,
  type BorrowerDebt,
} from "../services/borrowerDebtApi";
import {
  getBorrowerPayments,
  type BorrowerPayment,
} from "../services/borrowerPaymentApi";
import {
  getInventoryItems,
  type InventoryItem,
} from "../services/inventoryApi";
import { getOrders, type Order } from "../services/ordersApi";
import { getTenants, type Tenant } from "../services/tenantsApi";
import {
  getTenantPayments,
  type TenantPayment,
} from "../services/tenantPaymentApi";
import { getTenantRents, type TenantRent } from "../services/tenantRentApi";
import { useAppTheme } from "../theme/ThemeContext";
import EntypoIcon from "react-native-vector-icons/Entypo";

type DashboardData = {
  borrowers: Borrower[];
  borrowerDebts: BorrowerDebt[];
  borrowerPayments: BorrowerPayment[];
  inventory: InventoryItem[];
  orders: Order[];
  tenants: Tenant[];
  tenantPayments: TenantPayment[];
  tenantRents: TenantRent[];
};

const emptyData: DashboardData = {
  borrowers: [],
  borrowerDebts: [],
  borrowerPayments: [],
  inventory: [],
  orders: [],
  tenants: [],
  tenantPayments: [],
  tenantRents: [],
};

function toNumber(value: string | number | undefined) {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function currency(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

function isComplete(status: string) {
  return ["complete", "completed", "paid"].includes(status.toLowerCase());
}

function newestDate(left: string, right: string) {
  return new Date(right || 0).getTime() - new Date(left || 0).getTime();
}

async function settle<T>(request: Promise<T[]>): Promise<T[]> {
  const result = await Promise.allSettled([request]);
  const [response] = result;

  return response.status === "fulfilled" ? response.value : [];
}

export function DashBoard() {
  const { colors } = useAppTheme();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        borrowers,
        borrowerDebts,
        borrowerPayments,
        inventory,
        orders,
        tenants,
        tenantPayments,
        tenantRents,
      ] = await Promise.all([
        settle(getBorrowers()),
        settle(getBorrowerDebts()),
        settle(getBorrowerPayments()),
        settle(getInventoryItems()),
        settle(getOrders()),
        settle(getTenants()),
        settle(getTenantPayments()),
        settle(getTenantRents()),
      ]);

      setData({
        borrowers,
        borrowerDebts,
        borrowerPayments,
        inventory,
        orders,
        tenants,
        tenantPayments,
        tenantRents,
      });
    } catch {
      setError("Could not load dashboard stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const inventoryCost = data.inventory.reduce(
      (total, item) => total + toNumber(item.buyingPrice),
      0
    );
    const inventoryRetail = data.inventory.reduce(
      (total, item) => total + toNumber(item.sellingPrice),
      0
    );
    const pendingOrders = data.orders.filter(
      (order) => !isComplete(order.status)
    );
    const completedOrders = data.orders.filter((order) =>
      isComplete(order.status)
    );
    const orderTotal = data.orders.reduce(
      (total, order) => total + order.estimatedTotal,
      0
    );
    const pendingRent = data.tenantRents
      .filter((rent) => rent.status === "Pending")
      .reduce((total, rent) => total + rent.roomRent, 0);
    const paidRent = data.tenantRents
      .filter((rent) => rent.status === "Paid")
      .reduce((total, rent) => total + rent.roomRent, 0);
    const tenantPayments = data.tenantPayments.reduce(
      (total, payment) => total + payment.value,
      0
    );
    const borrowerOutstanding = data.borrowers.reduce(
      (total, borrower) => total + borrower.debt,
      0
    );
    const borrowerCredits = data.borrowerDebts.reduce(
      (total, debt) => total + debt.value,
      0
    );
    const borrowerPayments = data.borrowerPayments.reduce(
      (total, payment) => total + payment.value,
      0
    );
    const recentOrder = [...data.orders].sort((a, b) =>
      newestDate(a.createdAt, b.createdAt)
    )[0];
    const topBorrower = [...data.borrowers].sort((a, b) => b.debt - a.debt)[0];

    return {
      borrowerCredits,
      borrowerOutstanding,
      borrowerPayments,
      completedOrders,
      inventoryCost,
      inventoryRetail,
      orderTotal,
      paidRent,
      pendingOrders,
      pendingRent,
      recentOrder,
      tenantPayments,
      topBorrower,
    };
  }, [data]);

  const insights = [
    `${stats.pendingOrders.length} order${
      stats.pendingOrders.length === 1 ? "" : "s"
    } still need attention.`,
    `${currency(stats.pendingRent)} rent is pending across tenant records.`,
    stats.topBorrower
      ? `${stats.topBorrower.name || "Top borrower"} has the highest udhar at ${currency(
          stats.topBorrower.debt
        )}.`
      : "No borrower dues recorded yet.",
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Main</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Store snapshot and insights
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Refresh dashboard"
          accessibilityRole="button"
          onPress={loadDashboard}
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
        >
          <Icon name="refresh" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            Dashboard unavailable
          </Text>
          <Text style={[styles.muted, { color: colors.textMuted }]}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.statGrid}>
            <StatCard
              family="Entypo"
              icon="archive"
              label="Inventory"
              value={`${data.inventory.length}`}
              detail={`${currency(stats.inventoryRetail)} retail`}
            />
            <StatCard
              icon="shopping-cart"
              label="Orders"
              value={currency(stats.orderTotal)}
              detail={`${stats.pendingOrders.length} pending`}
            />
            <StatCard
              icon="building"
              label="Tenants"
              value={`${data.tenants.length}`}
              detail={`${currency(stats.pendingRent)} due`}
            />
            <StatCard
              icon="credit-card"
              label="Borrowers"
              value={`${data.borrowers.length}`}
              detail={`${currency(stats.borrowerOutstanding)} udhar`}
            />
          </View>

          <View style={[styles.panel, { backgroundColor: colors.surface }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>
              Money Overview
            </Text>
            <MetricRow
              label="Inventory cost"
              value={currency(stats.inventoryCost)}
            />
            <MetricRow
              label="Potential margin"
              value={currency(stats.inventoryRetail - stats.inventoryCost)}
            />
            <MetricRow
              label="Rent collected"
              value={currency(stats.paidRent + stats.tenantPayments)}
            />
            <MetricRow
              label="Borrower payments"
              value={currency(stats.borrowerPayments)}
            />
          </View>

          <View style={[styles.panel, { backgroundColor: colors.surface }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>
              Insights
            </Text>
            {insights.map((insight) => (
              <View key={insight} style={styles.insightRow}>
                <Icon name="circle" size={7} color={colors.accent} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  {insight}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.panel, { backgroundColor: colors.surface }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>
              Recent Activity
            </Text>
            <MetricRow
              label="Latest order"
              value={
                stats.recentOrder
                  ? stats.recentOrder.vendor || stats.recentOrder.type || "Order"
                  : "No orders"
              }
            />
            <MetricRow
              label="Completed orders"
              value={`${stats.completedOrders.length}`}
            />
            <MetricRow
              label="Borrower credit"
              value={currency(stats.borrowerCredits)}
            />
          </View>
        </>
      )}
    </ScrollView>
  );

  function StatCard({
    detail,
    icon,
    label,
    value,
    family = "FontAwesome",
  }: {
    detail: string;
    family?: "FontAwesome" | "Entypo";
    icon: string;
    label: string;
    value: string;
  }) {
    const StatIcon = family === "Entypo" ? EntypoIcon : Icon;

    return (
      <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
        <View
          style={[styles.statIcon, { backgroundColor: colors.surfaceMuted }]}
        >
          <StatIcon name={icon} size={15} color={colors.accent} />
        </View>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.statDetail, { color: colors.textMuted }]}>
          {detail}
        </Text>
      </View>
    );
  }

  function MetricRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={[styles.metricRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 130,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Nippo-Medium",
    fontSize: 24,
    fontWeight: "400",
  },
  subtitle: {
    fontFamily: "Nippo-Medium",
    fontSize: 12,
    marginTop: 4,
  },
  refreshBtn: {
    alignItems: "center",
    borderRadius: 18,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  loader: {
    marginTop: 48,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    borderRadius: 8,
    minHeight: 132,
    padding: 12,
    width: "48%",
  },
  statIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    marginBottom: 10,
    width: 32,
  },
  statLabel: {
    fontFamily: "Nippo-Medium",
    fontSize: 11,
  },
  statValue: {
    fontFamily: "Nippo-Medium",
    fontSize: 20,
    fontWeight: "400",
    marginTop: 6,
  },
  statDetail: {
    fontFamily: "Nippo-Medium",
    fontSize: 11,
    marginTop: 7,
  },
  panel: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 14,
  },
  panelTitle: {
    fontFamily: "Nippo-Medium",
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 10,
  },
  muted: {
    fontFamily: "Nippo-Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  metricRow: {
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
  },
  metricLabel: {
    fontFamily: "Nippo-Medium",
    fontSize: 12,
  },
  metricValue: {
    flexShrink: 1,
    fontFamily: "Nippo-Medium",
    fontSize: 12,
    fontWeight: "400",
    marginLeft: 12,
    textAlign: "right",
  },
  insightRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 7,
  },
  insightText: {
    flex: 1,
    fontFamily: "Nippo-Medium",
    fontSize: 12,
    lineHeight: 18,
  },
});
