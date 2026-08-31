import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';

import { ComponentTypeService } from '../../../core/services/component-type.service';
import { ComponentTypeResponse } from '../../../core/models';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ComponentTypeForm } from './component-type-form/component-type-form';

@Component({
  selector: 'app-component-types-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatSlideToggleModule, PageHeader, LoadingSpinner, EmptyState],
  templateUrl: './component-types-list.html',
  styleUrl: './component-types-list.css',
})
export class ComponentTypesList implements OnInit {
  private readonly service = inject(ComponentTypeService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly items = signal<ComponentTypeResponse[]>([]);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly displayedColumns = ['code', 'name', 'description', 'active', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  protected openCreate(): void {
    this.dialog
      .open(ComponentTypeForm, { data: {}, width: '480px' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.notifications.success('Component type created.');
          this.load();
        }
      });
  }

  protected openEdit(componentType: ComponentTypeResponse): void {
    this.dialog
      .open(ComponentTypeForm, { data: { componentType }, width: '480px' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.notifications.success('Component type updated.');
          this.load();
        }
      });
  }

  protected toggleActive(item: ComponentTypeResponse): void {
    this.togglingId.set(item.id);
    this.service.update(item.id, { code: item.code, name: item.name, description: item.description ?? undefined, active: !item.active }).subscribe({
      next: () => {
        this.notifications.success(!item.active ? 'Component type activated.' : 'Component type deactivated.');
        this.togglingId.set(null);
        this.load();
      },
      error: () => {
        this.notifications.error('Unable to update this component type.');
        this.togglingId.set(null);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service.list({ size: 100, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this.items.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
