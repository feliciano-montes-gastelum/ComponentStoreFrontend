import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { InventoryService } from '../../../core/services/inventory.service';
import { UserComponentRequestService } from '../../../core/services/user-component-request.service';
import { ComponentTypeService } from '../../../core/services/component-type.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';

interface DashboardTile {
  label: string;
  value: number | null;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, PageHeader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly requestService = inject(UserComponentRequestService);
  private readonly componentTypeService = inject(ComponentTypeService);

  protected readonly tiles = signal<DashboardTile[]>([
    { label: 'Active components', value: null, icon: 'memory', link: '/admin/inventory' },
    { label: 'Component types', value: null, icon: 'category', link: '/admin/component-types' },
    { label: 'Component requests', value: null, icon: 'pending_actions', link: '/admin/requests' },
  ]);

  protected readonly links = [
    { label: 'Manage inventory', icon: 'inventory_2', route: '/admin/inventory' },
    { label: 'Component types', icon: 'category', route: '/admin/component-types' },
    { label: 'Users & roles', icon: 'group', route: '/admin/users' },
    { label: 'Pickup availability', icon: 'event_available', route: '/admin/pickup-availability' },
    { label: 'Component requests', icon: 'assignment', route: '/admin/requests' },
    { label: 'Inventory history', icon: 'history', route: '/admin/inventory-history' },
  ];

  ngOnInit(): void {
    this.inventoryService.search({ active: true, size: 1 }).subscribe((page) => this.updateTile('Active components', page.totalElements));
    this.componentTypeService.list({ size: 1 }).subscribe((page) => this.updateTile('Component types', page.totalElements));
    this.requestService.list({ size: 1 }).subscribe((page) => this.updateTile('Pending requests', page.totalElements));
  }

  private updateTile(label: string, value: number): void {
    this.tiles.update((tiles) => tiles.map((tile) => (tile.label === label ? { ...tile, value } : tile)));
  }
}
