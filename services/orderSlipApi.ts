const ORDER_SLIP_BASE_PATH = '/order-slips';

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

export function getOrderSlipUrl(orderId: string) {
  return `${trimTrailingSlash(__SERVER_URL__)}${ORDER_SLIP_BASE_PATH}/${encodeURIComponent(
    orderId,
  )}`;
}

export function getOrderSlipDownloadUrl(orderId: string) {
  return `${getOrderSlipUrl(orderId)}/download`;
}

export function getOrderSlipFileName(orderId: string) {
  return `order-slip-${orderId}.pdf`;
}
