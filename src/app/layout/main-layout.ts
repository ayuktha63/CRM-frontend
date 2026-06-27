import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavItem, SideNavComponent } from 'orque-ui';
import { AuthService } from '../core/services/auth';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SideNavComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', svgPath: 'M3 13h8V3H3v10zm10 8h8v-6h-8v6zM3 21h8v-6H3v6zm10-8h8V3h-8v10z' },
    { key: 'contacts', label: 'Contacts', svgPath: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
    { key: 'leads', label: 'Leads', svgPath: 'M12 2L2 7l10 5 10-5-10-5zm0 7.75L5.5 7 12 4.25 18.5 7 12 9.75zM2 17l10 5 10-5v-2l-10 5-10-5v2zm0-5l10 5 10-5v-2l-10 5-10-5v2z' },
    { key: 'pipeline', label: 'Pipeline', svgPath: 'M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z' },
    { key: 'tasks', label: 'Tasks', svgPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14l-5-5 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z' },
    { key: 'emails', label: 'Emails', svgPath: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' },
    { key: 'reports', label: 'Reports', svgPath: 'M3 3v18h18v-2H5V3H3zm14 12h2V7h-2v8zm-4 0h2V5h-2v10zm-4 0h2v-6H9v6z' }
  ];

  activeKey = 'dashboard';

  onNavChange(key: string): void {
    this.activeKey = key;
    this.router.navigate([`/${key}`]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}