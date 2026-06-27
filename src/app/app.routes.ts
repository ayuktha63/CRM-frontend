import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { MainLayoutComponent } from './layout/main-layout';
import { DashboardComponent } from './features/dashboard/dashboard';
import { ContactsComponent } from './features/contacts/contacts';
import { CreateContactComponent } from './features/contacts/create-contact/create-contact';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'contacts',
        component: ContactsComponent
      },
      {
        path: 'contacts/create',
        component: CreateContactComponent
      }
    ]
  }
];