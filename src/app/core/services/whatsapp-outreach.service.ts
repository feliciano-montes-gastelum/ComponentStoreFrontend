import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { PublicContactService } from './public-contact.service';
import { buildWhatsAppUrl } from '../../shared/utils/whatsapp-message.util';
import { isBrowserPlatform } from '../../shared/utils/platform.util';

export type WhatsAppOutcome =
  | { kind: 'opened' }
  | { kind: 'popup-blocked'; url: string }
  | { kind: 'no-principal-contact' };

/**
 * Hands a just-saved pickup request / component request off to WhatsApp, without ever calling
 * WhatsApp from the backend. The database save is always the primary operation — this only runs
 * after it has already succeeded, and its own failure (no principal contact configured, or the
 * browser blocking the popup) is never reported as a save failure.
 */
@Injectable({ providedIn: 'root' })
export class WhatsAppOutreachService {
  private readonly publicContact = inject(PublicContactService);
  private readonly isBrowser = isBrowserPlatform();

  /**
   * Opens a blank tab synchronously — call this directly from the triggering click/submit
   * handler, BEFORE any async work (the backend save included), so the browser still attributes
   * the tab to the user's own gesture instead of blocking it as an unsolicited popup. Returns
   * null during SSR, or if the browser blocked it outright even at this point.
   */
  openPlaceholder(): Window | null {
    return this.isBrowser ? window.open('about:blank', '_blank') : null;
  }

  /**
   * Looks up the principal contact and, if one is configured, navigates `popup` (from
   * openPlaceholder()) to the resulting wa.me link. If `popup` is null/closed (blocked, or
   * openPlaceholder() wasn't called from a real user gesture), returns the built URL instead so
   * the caller can offer a manual "Open WhatsApp" retry button — retrying via a fresh click is
   * itself a fresh user gesture, so window.open() on that retry is not blocked either.
   */
  send(popup: Window | null, message: string): Observable<WhatsAppOutcome> {
    return this.publicContact.getPrincipalContact().pipe(
      map((contact): WhatsAppOutcome => {
        const url = buildWhatsAppUrl(contact.whatsappNumber, message);
        if (popup && !popup.closed) {
          popup.location.href = url;
          return { kind: 'opened' };
        }
        return { kind: 'popup-blocked', url };
      }),
      catchError(() => {
        popup?.close();
        return of<WhatsAppOutcome>({ kind: 'no-principal-contact' });
      })
    );
  }
}
