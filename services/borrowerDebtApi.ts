import axios from 'axios';

export type BorrowerDebt = {
  id: string;
  borrower: string; // always a plain MongoDB ObjectId string after normalization
  debtTaken: Date;
  value: number;
  createdAt: string;
  updatedAt: string;
};

export type BorrowerDebtInput = Omit<BorrowerDebt, 'id' | 'createdAt' | 'updatedAt'>;

// The server may return `borrower` as:
//   - a plain ObjectId string     → "664abc123..."
//   - a populated sub-document   → { _id: "664abc123...", name: "Ali", ... }
// Both cases are normalised to a plain id string.
type BorrowerRef = string | { _id?: string; id?: string; [key: string]: unknown };

type BorrowerDebtApiItem = {
  _id?: string;
  borrower?: BorrowerRef;
  debtTaken?: Date | string;
  value?: number | string;
  createdAt?: string;
  updatedAt?: string;
};

type BorrowerDebtApiResponse =
  | BorrowerDebtApiItem
  | { borrowerDebt?: BorrowerDebtApiItem };

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 12315120,
});

function toNumber(value: number | string | undefined): number {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

// Extracts a plain string ObjectId from whatever shape the server sends back.
function extractBorrowerId(borrower: BorrowerRef | undefined): string {
  if (!borrower) return '';
  if (typeof borrower === 'string') return borrower;
  // Populated object — _id is the canonical Mongoose field
  return String(borrower._id || borrower.id || '');
}

function normalizeBorrowerDebt(debt: BorrowerDebtApiItem): BorrowerDebt {
  return {
    id: debt._id || '',
    borrower: extractBorrowerId(debt.borrower),
    debtTaken: debt.debtTaken ? new Date(debt.debtTaken) : new Date(),
    value: toNumber(debt.value),
    createdAt: debt.createdAt || '',
    updatedAt: debt.updatedAt || '',
  };
}

function unwrapBorrowerDebtResponse(
  response: BorrowerDebtApiResponse,
): BorrowerDebtApiItem {
  if ('borrowerDebt' in response && response.borrowerDebt) {
    return response.borrowerDebt;
  }
  return response as BorrowerDebtApiItem;
}

// Always sends a plain string id to the server — never a populated object.
function serializeBorrowerDebtForApi(debt: BorrowerDebtInput) {
  return {
    borrower: debt.borrower, // already a plain string id from BorrowerDebtInput
    value: debt.value,
  };
}

export async function getBorrowerDebts(): Promise<BorrowerDebt[]> {
  const response = await api.get<
    BorrowerDebtApiItem[] | { borrowerDebts: BorrowerDebtApiItem[] }
  >('/borrower-debts');

  const debts = Array.isArray(response.data)
    ? response.data
    : response.data.borrowerDebts || [];

  return debts.map(normalizeBorrowerDebt);
}

export async function getBorrowerDebtById(id: string): Promise<BorrowerDebt> {
  const response = await api.get<BorrowerDebtApiResponse>(`/borrower-debts/${id}`);
  return normalizeBorrowerDebt(unwrapBorrowerDebtResponse(response.data));
}

export async function createBorrowerDebt(debt: BorrowerDebtInput): Promise<BorrowerDebt> {
  const response = await api.post<BorrowerDebtApiResponse>(
    '/borrower-debts',
    serializeBorrowerDebtForApi(debt),
  );
  return normalizeBorrowerDebt(unwrapBorrowerDebtResponse(response.data));
}

export async function updateBorrowerDebt(
  id: string,
  debt: BorrowerDebtInput,
): Promise<BorrowerDebt> {
  const response = await api.put<BorrowerDebtApiResponse>(
    `/borrower-debts/${id}`,
    serializeBorrowerDebtForApi(debt),
  );
  return normalizeBorrowerDebt(unwrapBorrowerDebtResponse(response.data));
}

export async function deleteBorrowerDebt(id: string): Promise<BorrowerDebt> {
  const response = await api.delete<BorrowerDebtApiResponse>(`/borrower-debts/${id}`);
  return normalizeBorrowerDebt(unwrapBorrowerDebtResponse(response.data));
}