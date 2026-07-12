import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

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
  template: `
    <div class="pending-wrap">
      <div class="pending-card">
        <div class="icon-wrap">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h1>License Not Applied</h1>
        <p class="desc">
          Your account doesn't have an activated license yet, so CRM access isn't
          available. Ask your system admin to apply your personal license key in
          <strong>OPAC &rarr; Tenant Configuration &rarr; My Subscriptions</strong>.
        </p>

        <div class="actions">
          <button class="btn-retry" (click)="retry()">Log In Again to Check</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pending-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      padding: 24px;
    }
    .pending-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,.06);
    }
    .icon-wrap {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #fef3c7;
      color: #d97706;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 12px;
      color: #111827;
    }
    .desc {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 32px;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-retry {
      background: #0F3460;
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-retry:hover { background: #0c2a4d; }
  `]
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
