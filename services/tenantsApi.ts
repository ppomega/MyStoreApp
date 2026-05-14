import axios from 'axios';

export type Tenant = {
  id: string;
  name: string;
  phone: string;
  rent: number;
  doj: Date | undefined;
  lastRent: Date | undefined;
  lastCreditedValue: number;
  lastDebitedValue: number;
  createdAt: string;
  updatedAt: string;
};

export type TenantInput = Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>;

type TenantApiItem = {
  _id?: string;
  id?: string;
  name?: string;
  phone?: string | number;
  rent?: string | number;
  doj?: Date | string;
  lastRent?: Date | string;
  lastCreditedValue?: string | number;
  lastDebitedValue?: string | number;
  createdAt?: string;
  updatedAt?: string;
};

type TenantApiResponse =
  | TenantApiItem
  | {
      tenant?: TenantApiItem;
    };

const api = axios.create({
  baseURL: __SERVER_URL__,
  timeout: 10000,
});

function toNumber(value: string | number | undefined) {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function normalizeTenant(tenant: TenantApiItem): Tenant {
  return {
    id: tenant.id || tenant._id || '',
    name: tenant.name || '',
    phone: tenant.phone === undefined ? '' : String(tenant.phone),
    rent: toNumber(tenant.rent),
    doj: tenant.doj ? new Date(tenant.doj) : undefined,
    lastRent: tenant.lastRent ? new Date(tenant.lastRent) : undefined,
    lastCreditedValue: toNumber(tenant.lastCreditedValue),
    lastDebitedValue: toNumber(tenant.lastDebitedValue),
    createdAt: tenant.createdAt || '',
    updatedAt: tenant.updatedAt || '',
  };
}

function unwrapTenantResponse(response: TenantApiResponse): TenantApiItem {
  if ('tenant' in response && response.tenant) {
    return response.tenant;
  }

  return response as TenantApiItem;
}

function serializeTenantForApi(tenant: TenantInput) {
  return {
    name: tenant.name,
    phone: tenant.phone,
    rent: tenant.rent,
    doj: tenant.doj,
    lastRent: tenant.lastRent,
    lastCreditedValue: tenant.lastCreditedValue,
    lastDebitedValue: tenant.lastDebitedValue,
  };
}

export async function getTenants() {
  const response = await api.get<
    TenantApiItem[] | { tenants: TenantApiItem[] }
  >('/tenants');
  const tenants = Array.isArray(response.data)
    ? response.data
    : response.data.tenants || [];

  return tenants.map(normalizeTenant);
}

export async function createTenant(tenant: TenantInput) {
  const response = await api.post<TenantApiResponse>(
    '/tenants',
    serializeTenantForApi(tenant),
  );
  return normalizeTenant(unwrapTenantResponse(response.data));
}

export async function updateTenant(id: string, tenant: TenantInput) {
  const response = await api.put<TenantApiResponse>(
    `/tenants/${id}`,
    serializeTenantForApi(tenant),
  );
  return normalizeTenant(unwrapTenantResponse(response.data));
}

export async function deleteTenant(id: string) {
  await api.delete(`/tenants/${id}`);
}
