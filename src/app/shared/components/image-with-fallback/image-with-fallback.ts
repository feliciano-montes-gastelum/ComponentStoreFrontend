import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-image-with-fallback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showImage()) {
      <img [src]="src()" [alt]="alt()" (error)="onError()" loading="lazy" />
    } @else {
      <div class="app-image-fallback" role="img" [attr.aria-label]="alt()">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2v10h14V7H5Zm2 8 3.5-4.5 2.5 3 2-2.5L19 15H7Zm2.5-6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
          />
        </svg>
        <span>No image available</span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: var(--mat-sys-surface-container-low, #f3f3f3);
      }
      .app-image-fallback {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: var(--mat-sys-surface-container-low, #f3f3f3);
        color: var(--mat-sys-outline, #767680);
      }
      .app-image-fallback svg {
        width: 2.5rem;
        height: 2.5rem;
        fill: currentColor;
      }
      .app-image-fallback span {
        font-size: 0.8rem;
      }
    `,
  ],
})
export class ImageWithFallback {
  readonly src = input<string | null | undefined>(null);
  readonly alt = input('Component image');

  private readonly errored = signal(false);

  protected readonly showImage = computed(() => !!this.src() && !this.errored());

  constructor() {
    effect(() => {
      this.src();
      this.errored.set(false);
    });
  }

  protected onError(): void {
    this.errored.set(true);
  }
}
