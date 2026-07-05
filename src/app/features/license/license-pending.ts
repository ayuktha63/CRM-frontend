import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-license-pending',
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

        <h1>License Not Activated</h1>
        <p class="desc">
          Your organization does not have an active license yet.<br>
          Please contact your platform administrator to apply a license before you can access the application.
        </p>

        <div class="steps">
          <div class="step">
            <span class="step-num">1</span>
            <div>
              <strong>Platform admin applies master license</strong>
              <p>The Orque platform admin activates the master license for your organization in the admin portal.</p>
            </div>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <div>
              <strong>Individual license key is generated</strong>
              <p>A CRM-specific license key is generated from the master license and sent to your admin.</p>
            </div>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <div>
              <strong>Your admin activates it here</strong>
              <p>Your organization admin pastes the license key in <strong>Settings &rarr; License</strong> to activate access.</p>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn-retry" (click)="retry()">Check Again</button>
          <button class="btn-logout" (click)="logout()">Sign Out</button>
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
      max-width: 560px;
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
    .steps {
      text-align: left;
      border-top: 1px solid #f3f4f6;
      padding-top: 24px;
      margin-bottom: 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .step-num {
      width: 28px;
      height: 28px;
      min-width: 28px;
      border-radius: 50%;
      background: #0F3460;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      margin-top: 2px;
    }
    .step strong {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      display: block;
      margin-bottom: 4px;
    }
    .step p {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
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
    .btn-retry:hover { background: #0F3460; }
    .btn-logout {
      background: #fff;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-logout:hover { background: #f9fafb; }
  `]
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
