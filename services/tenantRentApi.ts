import axios from 'axios';

export type TenantRent = {
  id: string;
  tenant: string;
  month: Date;
  roomRent: number;
  units: number;
  status: 'Paid' | 'Pending';
  createdAt: string;
  updatedAt: string;
};

export type TenantRentInput = Omit<
  TenantRent,
  'id' | 'createdAt' | 'updatedAt'
>;

type TenantRef = string | { _id?: string; id?: string; [key: string]: unknown };

type TenantRentApiItem = {
  _id?: string;
  tenant?: TenantRef;
  month?: Date | string;
  roomRent?: number | string;
  units?: number | string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TenantRentApiResponse =
  | TenantRentApiItem
  | { tenantRent?: TenantRentApiItem };

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 10000,
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

  return String(tenant.name || tenant.name || '');
}

function normalizeTenantRent(rent: TenantRentApiItem): TenantRent {
  return {
    id: rent._id || '',
    tenant: extractTenantName(rent.tenant),
    month: rent.month ? new Date(rent.month) : new Date(),
    roomRent: toNumber(rent.roomRent),
    units: toNumber(rent.units),
    status: rent.status === 'Paid' ? 'Paid' : 'Pending',
    createdAt: rent.createdAt || '',
    updatedAt: rent.updatedAt || '',
  };
}

function unwrapTenantRentResponse(
  response: TenantRentApiResponse,
): TenantRentApiItem {
  if ('tenantRent' in response && response.tenantRent) {
    return response.tenantRent;
  }

  return response as TenantRentApiItem;
}

function serializeTenantRentForApi(rent: TenantRentInput) {
  return {
    tenant: rent.tenant,
    month: rent.month,
    roomRent: rent.roomRent,
    units: rent.units,
    status: rent.status,
  };
}

export async function getTenantRents(): Promise<TenantRent[]> {
  const response = await api.get<
    TenantRentApiItem[] | { tenantRents: TenantRentApiItem[] }
  >('/tenant-rents');
 
  const rents = Array.isArray(response.data)
    ? response.data
    : response.data.tenantRents || [];
console.log('API response for tenant rents:', rents);
  return rents.map(normalizeTenantRent);
}

export async function createTenantRent(
  rent: TenantRentInput,
): Promise<TenantRent> {
  const response = await api.post<TenantRentApiResponse>(
    '/tenant-rents',
    serializeTenantRentForApi(rent),
  );

  return normalizeTenantRent(unwrapTenantRentResponse(response.data));
}

export async function updateTenantRent(
  id: string,
  rent: TenantRentInput,
): Promise<TenantRent> {
  const response = await api.put<TenantRentApiResponse>(
    `/tenant-rents/${id}`,
    serializeTenantRentForApi(rent),
  );

  return normalizeTenantRent(unwrapTenantRentResponse(response.data));
}

export async function deleteTenantRent(id: string): Promise<TenantRent> {
  const response = await api.delete<TenantRentApiResponse>(
    `/tenant-rents/${id}`,
  );

  return normalizeTenantRent(unwrapTenantRentResponse(response.data));
}

export async function markTenantRentPaid(id: string): Promise<TenantRent> {
  const response = await api.post<TenantRentApiResponse>(
    `/tenant-rents/${id}/mark-paid`,
  );

  return normalizeTenantRent(unwrapTenantRentResponse(response.data));
}
