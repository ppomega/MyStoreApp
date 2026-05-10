import axios from 'axios';

export type Borrower = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  paidAmount: number;
  reason: string;
  status: string;
  dueDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type BorrowerInput = Omit<Borrower, 'id' | 'createdAt' | 'updatedAt'>;

type BorrowerApiItem = {
  _id?: string;
  id?: string;
  name?: string;
  borrowerName?: string;
  phone?: string | number;
  mobile?: string | number;
  amount?: string | number;
  borrowedAmount?: string | number;
  paidAmount?: string | number;
  paid?: string | number;
  reason?: string;
  status?: string;
  dueDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BorrowerApiResponse =
  | BorrowerApiItem
  | {
      borrower?: BorrowerApiItem;
    };

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 10000,
});

function toNumber(value: string | number | undefined) {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function normalizeBorrower(borrower: BorrowerApiItem): Borrower {
  return {
    id: borrower.id || borrower._id || '',
    name: borrower.name || borrower.borrowerName || '',
    phone:
      borrower.phone === undefined
        ? String(borrower.mobile || '')
        : String(borrower.phone),
    amount: toNumber(borrower.amount || borrower.borrowedAmount),
    paidAmount: toNumber(borrower.paidAmount || borrower.paid),
    reason: borrower.reason || '',
    status: borrower.status || 'Pending',
    dueDate: borrower.dueDate || '',
    notes: borrower.notes || '',
    createdAt: borrower.createdAt || '',
    updatedAt: borrower.updatedAt || '',
  };
}

function unwrapBorrowerResponse(
  response: BorrowerApiResponse,
): BorrowerApiItem {
  if ('borrower' in response && response.borrower) {
    return response.borrower;
  }

  return response as BorrowerApiItem;
}

function serializeBorrowerForApi(borrower: BorrowerInput) {
  return {
    name: borrower.name,
    phone: borrower.phone,
    amount: borrower.amount,
    paidAmount: borrower.paidAmount,
    reason: borrower.reason,
    status: borrower.status,
    dueDate: borrower.dueDate,
    notes: borrower.notes,
  };
}

export async function getBorrowers() {
  const response = await api.get<
    BorrowerApiItem[] | { borrowers: BorrowerApiItem[] }
  >('/borrowers');
  const borrowers = Array.isArray(response.data)
    ? response.data
    : response.data.borrowers || [];

  return borrowers.map(normalizeBorrower);
}

export async function createBorrower(borrower: BorrowerInput) {
  const response = await api.post<BorrowerApiResponse>(
    '/borrowers',
    serializeBorrowerForApi(borrower),
  );
  return normalizeBorrower(unwrapBorrowerResponse(response.data));
}

export async function updateBorrower(id: string, borrower: BorrowerInput) {
  const response = await api.put<BorrowerApiResponse>(
    `/borrowers/${id}`,
    serializeBorrowerForApi(borrower),
  );
  return normalizeBorrower(unwrapBorrowerResponse(response.data));
}

export async function deleteBorrower(id: string) {
  await api.delete(`/borrowers/${id}`);
}
