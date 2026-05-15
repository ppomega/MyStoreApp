const TENANT_RENT_SLIP_BASE_PATH = '/tenant-rent-slips';

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

export function getTenantRentSlipUrl(tenantRentId: string) {
  return `${trimTrailingSlash(
    __SERVER_URL__,
  )}${TENANT_RENT_SLIP_BASE_PATH}/${encodeURIComponent(tenantRentId)}`;
}

export function getTenantRentSlipDownloadUrl(tenantRentId: string) {
  return `${getTenantRentSlipUrl(tenantRentId)}/download`;
}

export function getTenantRentSlipFileName(tenantRentId: string) {
  return `tenant-rent-slip-${tenantRentId}.pdf`;
}
