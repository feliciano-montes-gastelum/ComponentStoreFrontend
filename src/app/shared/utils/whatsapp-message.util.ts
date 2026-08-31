export interface PickupWhatsAppMessageParams {
  customerLabel: string;
  bagId: string;
  pickupAt: Date;
  /** IANA zone returned by the pickup-availability endpoint, e.g. "America/Phoenix" — never the browser's own zone. */
  timezone: string;
  itemCount: number;
  pickupNotes?: string | null;
  frontendBaseUrl: string;
}

export interface ComponentRequestWhatsAppMessageParams {
  customerLabel: string;
  requestId: string;
  componentName: string;
  partNumber?: string | null;
  manufacturer?: string | null;
  quantity: number;
  notes?: string | null;
  frontendBaseUrl: string;
  /** Route to link to for review — the admin request-management list, since there's no per-request detail route. */
  reviewPath: string;
}

/** e.g. "September 15, 2026 at 1:30 PM America/Phoenix" — always in `timezone`, regardless of the reader's own device zone. */
function formatPickupDateTime(date: Date, timezone: string): string {
  const datePart = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: 'long', day: 'numeric' }).format(
    date
  );
  const timePart = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(
    date
  );
  return `${datePart} at ${timePart} ${timezone}`;
}

/** Built after a successful PUT /api/purchase-bags/me/pickup, for the customer's device to open WhatsApp with. */
export function buildPickupWhatsAppMessage(params: PickupWhatsAppMessageParams): string {
  const lines = [
    'Hello Administrator,',
    '',
    'A new pickup time has been requested.',
    '',
    `Customer: ${params.customerLabel}`,
    `Bag: ${params.bagId}`,
    `Requested pickup: ${formatPickupDateTime(params.pickupAt, params.timezone)}`,
    `Items: ${params.itemCount}`,
  ];
  if (params.pickupNotes) {
    lines.push(`Notes: ${params.pickupNotes}`);
  }
  lines.push('', 'Review or change the pickup time:', `${params.frontendBaseUrl}/admin/purchase-bags/${params.bagId}`);
  return lines.join('\n');
}

/** Built after a successful POST /api/user-component-requests, for the customer's device to open WhatsApp with. */
export function buildComponentRequestWhatsAppMessage(params: ComponentRequestWhatsAppMessageParams): string {
  const lines = [
    'Hello Administrator,',
    '',
    'A new component request has been submitted.',
    '',
    `Customer: ${params.customerLabel}`,
    `Request ID: ${params.requestId}`,
    `Component: ${params.componentName}`,
  ];
  if (params.partNumber) {
    lines.push(`Part number: ${params.partNumber}`);
  }
  if (params.manufacturer) {
    lines.push(`Manufacturer: ${params.manufacturer}`);
  }
  lines.push(`Quantity: ${params.quantity}`);
  if (params.notes) {
    lines.push(`Notes: ${params.notes}`);
  }
  lines.push('', 'Review the request:', `${params.frontendBaseUrl}${params.reviewPath}`);
  return lines.join('\n');
}

/** wa.me deep link — `message` is percent-encoded so line breaks/punctuation survive. */
export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
