import axios from 'axios';
export type BorrowerPayment = {
  id: string;
  borrower: string; // always a plain MongoDB ObjectId string after normalization
  paymentTaken: Date;
  value: number;
  createdAt: string;
  updatedAt: string;
};

export type BorrowerPaymentInput = Omit<BorrowerPayment, 'id' | 'createdAt' | 'updatedAt'>;

// The server may return `borrower` as:
//   - a plain ObjectId string     → "664abc123..."
//   - a populated sub-document   → { _id: "664abc123...", name: "Ali", ... }
// Both cases are normalised to a plain id string.
type BorrowerRef = string | { _id?: string; id?: string; [key: string]: unknown };

type BorrowerPaymentApiItem = {
  _id?: string;
  borrower?: BorrowerRef;
  paymentTaken?: Date | string;
  value?: number | string;
  createdAt?: string;
  updatedAt?: string;
};

type BorrowerPaymentApiResponse =
  | BorrowerPaymentApiItem
  | { borrowerPayment?: BorrowerPaymentApiItem };

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 10000,
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

function normalizeBorrowerPayment(payment: BorrowerPaymentApiItem): BorrowerPayment {
  return {
    id: payment._id || '',
    borrower: extractBorrowerId(payment.borrower),
    paymentTaken: payment.paymentTaken ? new Date(payment.paymentTaken) : new Date(),
    value: toNumber(payment.value),
    createdAt: payment.createdAt || '',
    updatedAt: payment.updatedAt || '',
  };
}

function unwrapBorrowerPaymentResponse(
  response: BorrowerPaymentApiResponse,
): BorrowerPaymentApiItem {
  if ('borrowerPayment' in response && response.borrowerPayment) {
    return response.borrowerPayment;
  }
  return response as BorrowerPaymentApiItem;
}

// Always sends a plain string id to the server — never a populated object.
function serializeBorrowerPaymentForApi(payment: BorrowerPaymentInput) {
  return {
    borrower: payment.borrower, // already a plain string id from BorrowerPaymentInput
    paymentTaken: payment.paymentTaken,
    value: payment.value,
  };
}

export async function getBorrowerPayments(): Promise<BorrowerPayment[]> {
  const response = await api.get<
    BorrowerPaymentApiItem[] | { borrowerPayments: BorrowerPaymentApiItem[] }
  >('/borrower-payments');

  const payments = Array.isArray(response.data)
    ? response.data
    : response.data.borrowerPayments || [];

  return payments.map(normalizeBorrowerPayment);
}

export async function getBorrowerPaymentById(id: string): Promise<BorrowerPayment> {
  const response = await api.get<BorrowerPaymentApiResponse>(`/borrower-payments/${id}`);
  return normalizeBorrowerPayment(unwrapBorrowerPaymentResponse(response.data));
}

export async function createBorrowerPayment(payment: BorrowerPaymentInput): Promise<BorrowerPayment> {
  const response = await api.post<BorrowerPaymentApiResponse>(
    '/borrower-payments',
    serializeBorrowerPaymentForApi(payment),
  );
  return normalizeBorrowerPayment(unwrapBorrowerPaymentResponse(response.data));
}

export async function updateBorrowerPayment(
  id: string,
  payment: BorrowerPaymentInput,
): Promise<BorrowerPayment> {
  const response = await api.put<BorrowerPaymentApiResponse>(
    `/borrower-payments/${id}`,
    serializeBorrowerPaymentForApi(payment),
  );
  return normalizeBorrowerPayment(unwrapBorrowerPaymentResponse(response.data));
}

export async function deleteBorrowerPayment(id: string): Promise<BorrowerPayment> {
  const response = await api.delete<BorrowerPaymentApiResponse>(`/borrower-payments/${id}`);
  return normalizeBorrowerPayment(unwrapBorrowerPaymentResponse(response.data));
}