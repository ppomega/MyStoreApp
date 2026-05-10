import axios from 'axios';

export type Tenant = {
  id: string;
  name: string;
  phone: string;
  room: string;
  rent: number;
  advance: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TenantInput = Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>;

type TenantApiItem = {
  _id?: string;
  id?: string;
  name?: string;
  tenantName?: string;
  phone?: string | number;
  mobile?: string | number;
  room?: string | number;
  roomNumber?: string | number;
  rent?: string | number;
  monthlyRent?: string | number;
  advance?: string | number;
  securityDeposit?: string | number;
  status?: string;
  notes?: string;
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
    name: tenant.name || tenant.tenantName || '',
    phone:
      tenant.phone === undefined
        ? String(tenant.mobile || '')
        : String(tenant.phone),
    room:
      tenant.room === undefined
        ? String(tenant.roomNumber || '')
        : String(tenant.room),
    rent: toNumber(tenant.rent || tenant.monthlyRent),
    advance: toNumber(tenant.advance || tenant.securityDeposit),
    status: tenant.status || 'Active',
    notes: tenant.notes || '',
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
    room: tenant.room,
    rent: tenant.rent,
    advance: tenant.advance,
    status: tenant.status,
    notes: tenant.notes,
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
