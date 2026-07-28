import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

/**
 * Shown instead of the CRM app shell when the logged-in user has no personal
 * license activation on record — distinct from license-pending (which is about
 * the ORG having no license at all). This is per-user: the org may be fully
 * licensed, but nobody has applied a personal key for THIS account yet. Only
 * OPAC's per-user activation (Tenant Configuration -> My Subscriptions) grants
 * CRM access; there's no separate "apply within CRM" step for individual users.
 */
@Component({
  selector: 'app-account-not-activated',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-not-activated.html',
  styleUrl: './account-not-activated.scss'
})
export class AccountNotActivatedComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** accessPolicy is only ever computed at login time, so re-checking means logging
   *  in again — there's no lightweight "refresh my access" call in this architecture. */
  retry(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
