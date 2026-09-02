import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'ComponentStore — Electronic Components, In Stock & Ready for Pickup',
  },
  {
    path: 'components/:id',
    loadComponent: () => import('./features/catalog/catalog-detail/catalog-detail').then((m) => m.CatalogDetail),
    title: 'Component details — ComponentStore',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    title: 'Sign in — ComponentStore',
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
    title: 'Register — ComponentStore',
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
    title: 'Reset password — ComponentStore',
  },

  // Authenticated guest (and administrator) routes.
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
    title: 'My profile — ComponentStore',
  },
  {
    path: 'my-requests',
    canActivate: [authGuard],
    loadComponent: () => import('./features/requests/my-requests-list/my-requests-list').then((m) => m.MyRequestsList),
    title: 'My requests — ComponentStore',
  },
  {
    path: 'my-requests/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/requests/new-request/new-request').then((m) => m.NewRequest),
    title: 'New request — ComponentStore',
  },
  {
    path: 'my-history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/my-history').then((m) => m.MyHistory),
    title: 'My history — ComponentStore',
  },
  {
    path: 'my-bag',
    canActivate: [authGuard],
    loadComponent: () => import('./features/purchase-bag/my-bag/my-bag').then((m) => m.MyBag),
    title: 'My bag — ComponentStore',
  },
  {
    path: 'my-bag/history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/purchase-bag/my-bag-history/my-bag-history').then((m) => m.MyBagHistory),
    title: 'My bag history — ComponentStore',
  },

  // Administrator routes.
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/dashboard/dashboard').then((m) => m.Dashboard),
    title: 'Admin dashboard — ComponentStore',
  },
  {
    path: 'admin/inventory',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/inventory/inventory-list/inventory-list').then((m) => m.InventoryList),
    title: 'Manage inventory — ComponentStore',
  },
  {
    path: 'admin/inventory/new',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/inventory/inventory-form/inventory-form').then((m) => m.InventoryForm),
    title: 'New component — ComponentStore',
  },
  {
    path: 'admin/inventory/:id/edit',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/inventory/inventory-form/inventory-form').then((m) => m.InventoryForm),
    title: 'Edit component — ComponentStore',
  },
  {
    path: 'admin/inventory/:id/images',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/inventory/inventory-images/inventory-images').then((m) => m.InventoryImages),
    title: 'Manage images — ComponentStore',
  },
  {
    path: 'admin/component-types',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/component-types/component-types-list').then((m) => m.ComponentTypesList),
    title: 'Component types — ComponentStore',
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/users/users-list').then((m) => m.UsersList),
    title: 'Users — ComponentStore',
  },
  {
    path: 'admin/users/:id',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/users/user-detail').then((m) => m.UserDetail),
    title: 'User details — ComponentStore',
  },
  {
    path: 'admin/pickup-availability',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pickup-availability/pickup-availability-list').then((m) => m.PickupAvailabilityList),
    title: 'Pickup availability — ComponentStore',
  },
  {
    path: 'admin/purchase-bags',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/purchase-bags/admin-purchase-bags-list').then((m) => m.AdminPurchaseBagsList),
    title: 'Purchase bags — ComponentStore',
  },
  {
    path: 'admin/purchase-bags/:id',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/purchase-bags/admin-purchase-bag-detail').then((m) => m.AdminPurchaseBagDetail),
    title: 'Purchase bag — ComponentStore',
  },
  {
    path: 'admin/scan/:userAuthenticationId',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/purchase-bags/admin-bag-scan/admin-bag-scan').then((m) => m.AdminBagScan),
    title: 'Scan customer — ComponentStore',
  },
  {
    path: 'admin/requests',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/requests/admin-requests-list').then((m) => m.AdminRequestsList),
    title: 'Component requests — ComponentStore',
  },
  {
    path: 'admin/inventory-history',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/inventory-history/admin-inventory-history').then((m) => m.AdminInventoryHistory),
    title: 'Inventory history — ComponentStore',
  },

  // Error pages.
  {
    path: 'forbidden',
    loadComponent: () => import('./features/errors/forbidden/forbidden').then((m) => m.Forbidden),
    title: 'Access denied — ComponentStore',
  },
  {
    path: '**',
    loadComponent: () => import('./features/errors/not-found/not-found').then((m) => m.NotFound),
    title: 'Page not found — ComponentStore',
  },
];
