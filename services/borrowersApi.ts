import axios from 'axios';

export type Borrower = {
  id: string;
  name: string;
  phone: string;
  initialDebt?: number,
  debt:number,
  lastCredit:Date|undefined,
  lastDebit:Date|undefined,
  lastCreditedValue:number,
  lastDebitedValue:number,
  createdAt: string;
  updatedAt: string;
};

export type BorrowerInput = Omit<Borrower, 'id' | 'createdAt' | 'updatedAt'>;

type BorrowerApiItem = {
  _id?: string;
  name?: string;
  initialDebt?: number | string;
  debt?: number;
  lastCredit?: Date;
  lastDebit?: Date;
  lastCreditedValue?: number;
  lastDebitedValue?: number;
  phone?: string | number;
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
  timeout: 12315120,
});

function toNumber(value: string | number | undefined) {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function normalizeBorrower(borrower: BorrowerApiItem): Borrower {
  return {
    id: borrower._id || '',
    name: borrower.name ||  '',
    phone:String(borrower.phone),
    initialDebt: toNumber(borrower.initialDebt),
    debt: toNumber(borrower.debt),
    lastCreditedValue: toNumber(borrower.lastCreditedValue),
    lastDebitedValue: toNumber(borrower.lastDebitedValue),
    lastCredit: borrower.lastCredit ? new Date(borrower.lastCredit) : undefined,
    lastDebit: borrower.lastDebit ? new Date(borrower.lastDebit) : undefined,
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
    initialDebt: borrower.initialDebt ?? borrower.debt,
    debt: borrower.debt,
    lastCreditedValue: borrower.lastCreditedValue,
    lastDebitedValue: borrower.lastDebitedValue,
    lastCredit: borrower.lastCredit,
    lastDebit: borrower.lastDebit,
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
