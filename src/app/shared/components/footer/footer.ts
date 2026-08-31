import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="app-footer">
      <p>&copy; {{ year }} ComponentStore. Prices and availability shown are for informational purposes only.</p>
      <nav aria-label="Footer">
        <a routerLink="/" fragment="catalog">Catalog</a>
        <a routerLink="/login">Sign in</a>
        <a routerLink="/register">Register</a>
      </nav>
    </footer>
  `,
  styles: [
    `
      .app-footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.5rem clamp(1rem, 4vw, 2.5rem);
        margin-top: 2rem;
        border-top: 1px solid var(--mat-sys-outline-variant);
        color: var(--mat-sys-on-surface-variant);
        font-size: 0.85rem;
      }
      .app-footer p {
        margin: 0;
      }
      .app-footer nav {
        display: flex;
        gap: 1rem;
      }
      .app-footer a {
        color: inherit;
      }
    `,
  ],
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
