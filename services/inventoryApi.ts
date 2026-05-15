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

export type InventoryModeValue =
  | Partial<Record<InventoryModeKey, number | string | undefined>>;

export const INVENTORY_MODE_RANK_GROUPS = [
  ["Loose"],
  ["Piece", "Bottle"],
  ["Packet"],
  ["Ladi", "Set", "Bag", "Katta", "Petti"],
] as const satisfies ReadonlyArray<ReadonlyArray<InventoryModeKey>>;

export type InventoryItem = {
  id: string;
  name: string;
  sellingPrice: string;
  buyingPrice: string;
  mode: InventoryMode;
  defaultMode: InventoryModeKey;
  category: string;
  weight: string;
};

export type InventoryItemInput = Omit<InventoryItem, "id">;

type InventoryApiItem = {
  _id?: string;
  id?: string;
  name?: string;
  sellingPrice?: string | number;
  buyingPrice?: string | number;
  mode?: InventoryMode | InventoryMode[];
  defaultMode?: string;
  category?: string;
  weight?: string;
};

type InventoryApiInput = Omit<
  InventoryItemInput,
  "mode" | "sellingPrice" | "buyingPrice" | "weight"
> & {
  sellingPrice: number;
  buyingPrice: number;
  mode: InventoryMode[];
  weight?: string;
};

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 12315120,
});

function normalizeMode(mode: InventoryApiItem["mode"]): InventoryMode {
  if (Array.isArray(mode)) {
    return Object.assign({}, ...mode);
  }

  return mode || {};
}

function getDefaultMode(
  defaultMode: string | undefined,
  mode: InventoryMode
): InventoryModeKey {
  if (
    defaultMode &&
    INVENTORY_MODE_KEYS.includes(defaultMode as InventoryModeKey)
  ) {
    return defaultMode as InventoryModeKey;
  }

  const firstMode = Object.keys(mode).find((key) =>
    INVENTORY_MODE_KEYS.includes(key as InventoryModeKey)
  );

  return (firstMode as InventoryModeKey | undefined) || "Piece";
}

function normalizeInventoryItem(
  item: InventoryApiItem,
  defaultModeFallback?: InventoryModeKey
): InventoryItem {
  const mode = normalizeMode(item.mode);

  return {
    id: item.id || item._id || "",
    name: item.name || "",
    sellingPrice:
      item.sellingPrice === undefined ? "" : String(item.sellingPrice),
    buyingPrice: item.buyingPrice === undefined ? "" : String(item.buyingPrice),
    mode,
    defaultMode: getDefaultMode(item.defaultMode || defaultModeFallback, mode),
    category: item.category || "",
    weight: item.weight || "",
  };
}

function serializeModeForApi(mode: InventoryMode) {
  return INVENTORY_MODE_KEYS.reduce<InventoryMode[]>((apiMode, modeKey) => {
    const value = mode[modeKey];

    if (value !== undefined) {
      apiMode.push({ [modeKey]: value });
    }

    return apiMode;
  }, []);
}

function serializeInventoryItemForApi(
  item: InventoryItemInput
): InventoryApiInput {
  const hasLooseMode = item.mode.Loose !== undefined;

  return {
    name: item.name,
    sellingPrice: Number(item.sellingPrice),
    buyingPrice: Number(item.buyingPrice),
    mode: serializeModeForApi(item.mode),
    defaultMode: item.defaultMode,
    category: item.category,
    ...(hasLooseMode ? { weight: item.weight } : {}),
  };
}

export function getInventoryModeRank(modeKey: InventoryModeKey) {
  const rank = INVENTORY_MODE_RANK_GROUPS.findIndex((group) =>
    (group as ReadonlyArray<InventoryModeKey>).includes(modeKey)
  );

  return rank === -1 ? 0 : rank;
}

export function getInventoryModeRankGroup(modeKey: InventoryModeKey) {
  return INVENTORY_MODE_RANK_GROUPS[getInventoryModeRank(modeKey)];
}

function getModeValue(mode: InventoryModeValue, modeKey: InventoryModeKey) {
  const amount = Number(mode[modeKey]);
  return Number.isNaN(amount) || amount <= 0 ? 1 : amount;
}

function getSelectedModeForRank(mode: InventoryModeValue, rank: number) {
  const rankGroup = INVENTORY_MODE_RANK_GROUPS[rank];

  return rankGroup.find((modeKey) => mode[modeKey] !== undefined);
}

function getRankStepValue(
  mode: InventoryModeValue,
  rank: number,
  rankMode?: InventoryModeKey
) {
  const selectedMode = rankMode || getSelectedModeForRank(mode, rank);
  return selectedMode ? getModeValue(mode, selectedMode) : 1;
}

export function getInventoryModePrice(
  basePrice: string | number,
  mode: InventoryModeValue,
  baseMode: InventoryModeKey,
  nextMode: InventoryModeKey
) {
  const price = Number(basePrice);

  if (Number.isNaN(price)) {
    return 0;
  }

  const baseRank = getInventoryModeRank(baseMode);
  const nextRank = getInventoryModeRank(nextMode);

  if (baseRank === nextRank) {
    return price;
  }

  if (nextRank > baseRank) {
    return Array.from(
      { length: nextRank - baseRank },
      (_item, index) => baseRank + index + 1
    ).reduce((convertedPrice, rank) => {
      const rankMode = rank === nextRank ? nextMode : undefined;
      return convertedPrice * getRankStepValue(mode, rank, rankMode);
    }, price);
  }

  return Array.from(
    { length: baseRank - nextRank },
    (_item, index) => baseRank - index
  ).reduce((convertedPrice, rank) => {
    const rankMode = rank === baseRank ? baseMode : undefined;
    return convertedPrice / getRankStepValue(mode, rank, rankMode);
  }, price);
}

export async function getInventoryItems() {
  const response = await api.get<InventoryApiItem[]>("/inventory");
  return response.data.map((item) => normalizeInventoryItem(item));
}

export async function createInventoryItem(item: InventoryItemInput) {
  const response = await api.post<InventoryApiItem>(
    "/inventory",
    serializeInventoryItemForApi(item)
  );
  return normalizeInventoryItem(response.data, item.defaultMode);
}

export async function updateInventoryItem(id: string, item: InventoryItemInput) {
  const requestBody = serializeInventoryItemForApi(item);

  console.log("Update inventory request:", {
    id,
    body: requestBody,
  });

  const response = await api.put<InventoryApiItem>(
    `/inventory/${id}`,
    requestBody
  );
  return normalizeInventoryItem(response.data, item.defaultMode);
}

export async function deleteInventoryItem(id: string) {
  await api.delete(`/inventory/${id}`);
}
