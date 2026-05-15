import axios from 'axios';

export type TenantPayment = {
  id: string;
  tenant: string;
  paymentDate: Date;
  value: number;
  createdAt: string;
  updatedAt: string;
};

export type TenantPaymentInput = Omit<
  TenantPayment,
  'id' | 'createdAt' | 'updatedAt'
>;

type TenantRef = string | { _id?: string; id?: string; name?: string; [key: string]: unknown };

type TenantPaymentApiItem = {
  _id?: string;
  id?: string;
  tenant?: TenantRef;
  paymentDate?: Date | string;
  value?: number | string;
  createdAt?: string;
  updatedAt?: string;
};

type TenantPaymentApiResponse =
  | TenantPaymentApiItem
  | { tenantPayment?: TenantPaymentApiItem };

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 12315120,
});

function toNumber(value: number | string | undefined): number {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function extractTenantName(tenant: TenantRef | undefined): string {
  if (!tenant) {
    return '';
  }

  if (typeof tenant === 'string') {
    return tenant;
  }

  return String(tenant.name || tenant._id || tenant.id || '');
}

function normalizeTenantPayment(
  payment: TenantPaymentApiItem,
): TenantPayment {
  return {
    id: payment._id || payment.id || '',
    tenant: extractTenantName(payment.tenant),
    paymentDate: payment.paymentDate
      ? new Date(payment.paymentDate)
      : new Date(),
    value: toNumber(payment.value),
    createdAt: payment.createdAt || '',
    updatedAt: payment.updatedAt || '',
  };
}

function unwrapTenantPaymentResponse(
  response: TenantPaymentApiResponse,
): TenantPaymentApiItem {
  if ('tenantPayment' in response && response.tenantPayment) {
    return response.tenantPayment;
  }

  return response as TenantPaymentApiItem;
}

function serializeTenantPaymentForApi(payment: TenantPaymentInput) {
  return {
    tenant: payment.tenant,
    paymentDate: payment.paymentDate,
    value: payment.value,
  };
}

export async function getTenantPayments(): Promise<TenantPayment[]> {
  const response = await api.get<
    TenantPaymentApiItem[] | { tenantPayments: TenantPaymentApiItem[] }
  >('/tenant-payments');

  const payments = Array.isArray(response.data)
    ? response.data
    : response.data.tenantPayments || [];

  return payments.map(normalizeTenantPayment);
}

export async function createTenantPayment(
  payment: TenantPaymentInput,
): Promise<TenantPayment> {
  const response = await api.post<TenantPaymentApiResponse>(
    '/tenant-payments',
    serializeTenantPaymentForApi(payment),
  );

  return normalizeTenantPayment(unwrapTenantPaymentResponse(response.data));
}

export async function updateTenantPayment(
  id: string,
  payment: TenantPaymentInput,
): Promise<TenantPayment> {
  const response = await api.put<TenantPaymentApiResponse>(
    `/tenant-payments/${id}`,
    serializeTenantPaymentForApi(payment),
  );

  return normalizeTenantPayment(unwrapTenantPaymentResponse(response.data));
}

export async function deleteTenantPayment(
  id: string,
): Promise<TenantPayment> {
  const response = await api.delete<TenantPaymentApiResponse>(
    `/tenant-payments/${id}`,
  );

  return normalizeTenantPayment(unwrapTenantPaymentResponse(response.data));
}
