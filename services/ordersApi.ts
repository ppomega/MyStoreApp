import axios from "axios";

export type OrderItem = {
  itemId: string;
  itemName: string;
  mode: string;
  quantity: number;
  price: number;
};

export type Order = {
  mongoId: string;
  items: OrderItem[];
  estimatedTotal: number;
  vendor: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderInput = {
  items: OrderItem[];
  estimatedTotal: number;
  vendor: string;
  status: string;
  type: string;
};

type OrderApiItem = {
  _id?: string;
  items?: OrderItem[];
  estimatedTotal?: string | number;
  vendor?: string;
  status?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
};

type OrderApiResponse =
  | OrderApiItem
  | {
      order?: OrderApiItem;
    };

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 10000,
});

function toNumber(value: string | number | undefined) {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function normalizeOrder(order: OrderApiItem): Order {
  return {
    mongoId: order._id || "",
    items: Array.isArray(order.items) ? order.items : [],
    estimatedTotal: toNumber(order.estimatedTotal),
    vendor: order.vendor || "",
    status: order.status || "",
    type: order.type || "",
    createdAt: order.createdAt || "",
    updatedAt: order.updatedAt || "",
  };
}

function unwrapOrderResponse(response: OrderApiResponse): OrderApiItem {
  if ("order" in response && response.order) {
    return response.order;
  }

  return response as OrderApiItem;
}

export async function getOrders() {
  const response = await api.get<OrderApiItem[] | { orders: OrderApiItem[] }>(
    "/orders"
  );
  const orders = Array.isArray(response.data)
    ? response.data
    : response.data.orders || [];

  return orders.map(normalizeOrder);
}

export async function createOrder(order: OrderInput) {
  const response = await api.post<OrderApiResponse>("/orders", {
    items: order.items,
    estimatedTotal: order.estimatedTotal,
    vendor: order.vendor,
    status: order.status,
    type: order.type,
  });
  return normalizeOrder(unwrapOrderResponse(response.data));
}

export async function updateOrder(mongoId: string, order: Partial<OrderInput>) {
  const response = await api.put<OrderApiResponse>(`/orders/${mongoId}`, {
    ...(order.items ? { items: order.items } : {}),
    ...(order.estimatedTotal !== undefined
      ? { estimatedTotal: order.estimatedTotal }
      : {}),
    ...(order.vendor ? { vendor: order.vendor } : {}),
    ...(order.status ? { status: order.status } : {}),
    ...(order.type ? { type: order.type } : {}),
  });
  return normalizeOrder(unwrapOrderResponse(response.data));
}

export async function deleteOrder(mongoId: string) {
  await api.delete(`/orders/${mongoId}`);
}
