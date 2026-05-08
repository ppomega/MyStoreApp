import axios from "axios";

export const INVENTORY_MODE_KEYS = [
  "Loose",
  "Piece",
  "Bottle",
  "Packet",
  "Ladi",
  "Set",
  "Bag",
  "Katta",
  "Petti",
] as const;

export type InventoryModeKey =
  (typeof INVENTORY_MODE_KEYS)[number];

export type InventoryMode = Partial<Record<InventoryModeKey, number>>;

export type InventoryItem = {
  id: string;
  name: string;
  sellingPrice: string;
  buyingPrice: string;
  mode: InventoryMode;
  category: string;
};

export type InventoryItemInput = Omit<InventoryItem, "id">;

type InventoryApiItem = {
  _id?: string;
  id?: string;
  name?: string;
  sellingPrice?: string | number;
  buyingPrice?: string | number;
  mode?: InventoryMode | InventoryMode[];
  category?: string;
};

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 10000,
});

function normalizeMode(mode: InventoryApiItem["mode"]): InventoryMode {
  if (Array.isArray(mode)) {
    return Object.assign({}, ...mode);
  }

  return mode || {};
}

function normalizeInventoryItem(item: InventoryApiItem): InventoryItem {
  return {
    id: item.id || item._id || "",
    name: item.name || "",
    sellingPrice:
      item.sellingPrice === undefined ? "" : String(item.sellingPrice),
    buyingPrice: item.buyingPrice === undefined ? "" : String(item.buyingPrice),
    mode: normalizeMode(item.mode),
    category: item.category || "",
  };
}

export async function getInventoryItems() {
  const response = await api.get<InventoryApiItem[]>("/inventory");
  return response.data.map(normalizeInventoryItem);
}

export async function createInventoryItem(item: InventoryItemInput) {
  const response = await api.post<InventoryApiItem>("/inventory", item);
  return normalizeInventoryItem(response.data);
}

export async function updateInventoryItem(id: string, item: InventoryItemInput) {
  const response = await api.put<InventoryApiItem>(`/inventory/${id}`, item);
  return normalizeInventoryItem(response.data);
}

export async function deleteInventoryItem(id: string) {
  await api.delete(`/inventory/${id}`);
}
