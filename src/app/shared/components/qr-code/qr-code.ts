import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { toDataURL } from 'qrcode';

import { isBrowserPlatform } from '../../utils/platform.util';

/**
 * Renders a QR code as a data-URI image. Generated client-side only (via an effect guarded by
 * isBrowserPlatform()) — during SSR/pre-hydration this shows a placeholder instead, since the
 * `qrcode` package's browser rendering path needs a real DOM canvas that SSR doesn't provide.
 */
@Component({
  selector: 'app-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dataUrl(); as src) {
      <img [src]="src" [width]="size()" [height]="size()" [alt]="ariaLabel()" class="app-qr-code" />
    } @else {
      <div
        class="app-qr-code app-qr-code--placeholder"
        [style.width.px]="size()"
        [style.height.px]="size()"
        role="img"
        [attr.aria-label]="ariaLabel()"
      ></div>
    }
  `,
  styles: [
    `
      .app-qr-code {
        display: block;
        border-radius: var(--app-radius-sm);
      }
      .app-qr-code--placeholder {
        background: var(--mat-sys-surface-container-high);
      }
    `,
  ],
})
export class QrCode {
  readonly value = input.required<string>();
  readonly size = input(180);
  readonly ariaLabel = input('QR code');

  protected readonly dataUrl = signal<string | null>(null);
  private readonly isBrowser = isBrowserPlatform();

  constructor() {
    effect(() => {
      const value = this.value();
      const size = this.size();
      if (!this.isBrowser || !value) {
        return;
      }
      toDataURL(value, { width: size, margin: 1 })
        .then((url) => this.dataUrl.set(url))
        .catch(() => this.dataUrl.set(null));
    });
  }
}
