import { buildComponentRequestWhatsAppMessage, buildPickupWhatsAppMessage, buildWhatsAppUrl } from './whatsapp-message.util';

describe('buildPickupWhatsAppMessage', () => {
  it('includes every required field, formatted in the given timezone', () => {
    const message = buildPickupWhatsAppMessage({
      customerLabel: 'Guest Test',
      bagId: 'bag-42',
      pickupAt: new Date('2026-09-15T20:30:00Z'), // 13:30 in America/Phoenix (UTC-7, no DST)
      timezone: 'America/Phoenix',
      itemCount: 4,
      pickupNotes: 'Please have the order ready at the front desk.',
      frontendBaseUrl: 'https://store.example.com',
    });

    expect(message).toContain('Customer: Guest Test');
    expect(message).toContain('Bag: bag-42');
    expect(message).toContain('Items: 4');
    expect(message).toContain('September 15, 2026');
    expect(message).toContain('America/Phoenix');
    expect(message).toContain('Notes: Please have the order ready at the front desk.');
    expect(message).toContain('https://store.example.com/admin/purchase-bags/bag-42');
  });

  it('omits the Notes line entirely when there are no pickup notes', () => {
    const message = buildPickupWhatsAppMessage({
      customerLabel: 'Guest Test',
      bagId: 'bag-1',
      pickupAt: new Date('2026-09-15T20:30:00Z'),
      timezone: 'America/Phoenix',
      itemCount: 1,
      pickupNotes: null,
      frontendBaseUrl: 'https://store.example.com',
    });
    expect(message).not.toContain('Notes:');
  });
});

describe('buildComponentRequestWhatsAppMessage', () => {
  it('includes every required field and falls back to the request-management list, since there is no per-request detail route', () => {
    const message = buildComponentRequestWhatsAppMessage({
      customerLabel: 'Guest Test',
      requestId: 'req-7',
      componentName: 'ESP32 development board',
      partNumber: 'ESP32-DEVKIT',
      manufacturer: null,
      quantity: 2,
      notes: 'USB-C version preferred.',
      frontendBaseUrl: 'https://store.example.com',
      reviewPath: '/admin/requests',
    });

    expect(message).toContain('Customer: Guest Test');
    expect(message).toContain('Request ID: req-7');
    expect(message).toContain('Component: ESP32 development board');
    expect(message).toContain('Part number: ESP32-DEVKIT');
    expect(message).not.toContain('Manufacturer:');
    expect(message).toContain('Quantity: 2');
    expect(message).toContain('Notes: USB-C version preferred.');
    expect(message).toContain('https://store.example.com/admin/requests');
  });

  it('includes Manufacturer only when present', () => {
    const message = buildComponentRequestWhatsAppMessage({
      customerLabel: 'Guest Test',
      requestId: 'req-8',
      componentName: 'Widget',
      partNumber: null,
      manufacturer: 'Acme',
      quantity: 1,
      notes: null,
      frontendBaseUrl: 'https://store.example.com',
      reviewPath: '/admin/requests',
    });
    expect(message).toContain('Manufacturer: Acme');
    expect(message).not.toContain('Part number:');
    expect(message).not.toContain('Notes:');
  });
});

describe('buildWhatsAppUrl', () => {
  it('percent-encodes the full message, including line breaks and punctuation', () => {
    const url = buildWhatsAppUrl('5550102', 'Line one\nLine two: with punctuation!');
    expect(url).toBe('https://wa.me/5550102?text=' + encodeURIComponent('Line one\nLine two: with punctuation!'));
    expect(decodeURIComponent(url.split('text=')[1])).toBe('Line one\nLine two: with punctuation!');
  });

  it('uses the whatsapp number verbatim in the path', () => {
    expect(buildWhatsAppUrl('5215512345678', 'hi')).toBe('https://wa.me/5215512345678?text=hi');
  });
});
