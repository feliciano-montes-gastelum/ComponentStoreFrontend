import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';
import { DevRoleSwitcher } from './shared/components/dev-role-switcher/dev-role-switcher';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, DevRoleSwitcher],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Read once: used only to gate the @defer block below so the dev role switcher (and the
  // Material module it pulls in) is split into its own lazy chunk instead of the eager main
  // bundle, and is never fetched at all unless enabled (on for "development", off for
  // "production" and "local" — see environment.*.ts).
  protected readonly showDevRoleSwitcher = environment.enableDevRoleSwitcher;
}
