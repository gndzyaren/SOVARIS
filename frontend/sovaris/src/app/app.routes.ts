import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'validate', pathMatch: 'full' },
  {
    path: 'validate',
    loadComponent: () =>
      import('./pages/validate/validate.component').then(m => m.ValidateComponent)
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./pages/history/history.component').then(m => m.HistoryComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'result/:id',
    loadComponent: () =>
      import('./pages/result/result.component').then(m => m.ResultComponent)
  }
];
