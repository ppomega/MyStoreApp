import axios from 'axios';

export type TenantRent = {
  id: string;
  tenant: string;
  month: Date;
  roomRent: number;
  beforeUnits: number;
  afterUnits: number;
  units: number;
  unitRate: number;
  totalRent: number;
  status: 'Paid' | 'Pending';
  rentSlip?: {
    filePath?: string;
    fileName?: string;
    generatedAt?: string;
  };
  previousRent?: {
    id: string;
    month: Date;
    beforeUnits: number;
    afterUnits: number;
    units: number;
    totalRent: number;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantRentInput = Omit<
  TenantRent,
  'id' | 'createdAt' | 'updatedAt'
>;

type TenantRef = string | { _id?: string; id?: string; name?: string; [key: string]: unknown };

type TenantRentApiItem = {
  _id?: string;
  id?: string;
  tenant?: TenantRef;
  month?: Date | string;
  roomRent?: number | string;
  beforeUnits?: number | string;
  afterUnits?: number | string;
  units?: number | string;
  unitRate?: number | string;
  totalRent?: number | string;
  status?: string;
  rentSlip?: {
    filePath?: string;
    fileName?: string;
    generatedAt?: string;
  };
  previousRent?: {
    _id?: string;
    id?: string;
    month?: Date | string;
    beforeUnits?: number | string;
    afterUnits?: number | string;
    units?: number | string;
    totalRent?: number | string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type TenantRentApiResponse =
  | TenantRentApiItem
  | { tenantRent?: TenantRentApiItem };

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

function normalizeTenantRent(rent: TenantRentApiItem): TenantRent {
  const beforeUnits = toNumber(rent.beforeUnits);
  const afterUnits = toNumber(rent.afterUnits);
  const units =
    rent.units === undefined ? Math.max(afterUnits - beforeUnits, 0) : toNumber(rent.units);
  const roomRent = toNumber(rent.roomRent);
  const unitRate = rent.unitRate === undefined ? 8 : toNumber(rent.unitRate);

  return {
    id: rent._id || rent.id || '',
    tenant: extractTenantName(rent.tenant),
    month: rent.month ? new Date(rent.month) : new Date(),
    roomRent,
    beforeUnits,
    afterUnits,
    units,
    unitRate,
    totalRent: rent.totalRent === undefined ? roomRent + units * unitRate : toNumber(rent.totalRent),
    status: rent.status === 'Paid' ? 'Paid' : 'Pending',
    rentSlip: rent.rentSlip,
    previousRent: rent.previousRent
      ? {
          id: rent.previousRent._id || rent.previousRent.id || '',
          month: rent.previousRent.month ? new Date(rent.previousRent.month) : new Date(),
          beforeUnits: toNumber(rent.previousRent.beforeUnits),
          afterUnits: toNumber(rent.previousRent.afterUnits),
          units: toNumber(rent.previousRent.units),
          totalRent: toNumber(rent.previousRent.totalRent),
        }
      : null,
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
    beforeUnits: rent.beforeUnits,
    afterUnits: rent.afterUnits,
    units: rent.units,
    unitRate: rent.unitRate,
    totalRent: rent.totalRent,
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
