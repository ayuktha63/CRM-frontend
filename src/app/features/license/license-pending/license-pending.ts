import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-license-pending',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './license-pending.html',
  styleUrl: './license-pending.scss'
})
export class LicensePendingComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  retry(): void {
    // Clear cached license state so guard re-fetches on next navigation
    localStorage.removeItem('accesspolicy');
    localStorage.removeItem('licenseStatus');
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
