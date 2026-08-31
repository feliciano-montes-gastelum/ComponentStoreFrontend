import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CatalogList } from '../catalog/catalog-list/catalog-list';

/**
 * The landing page shows the full browsable/searchable catalog directly (via the same
 * CatalogList that used to have its own /components route) beneath a short hero banner, rather
 * than a separate "recently added" preview.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CatalogList],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
