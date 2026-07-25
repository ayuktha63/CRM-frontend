import { Component, inject } from '@angular/core';
import { SessionGuardService } from '../../services/session-guard.service';

@Component({
  selector: 'app-session-guard-modal',
  standalone: true,
  template: `
    @if (guard.visible()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:5000;padding:24px;">
        <div style="background:var(--crm-card, #fff);border-radius:16px;width:100%;max-width:420px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);padding:28px 28px 24px;text-align:center;">
          <h2 style="font-size:1.1rem;font-weight:700;margin:0 0 10px;color:var(--crm-text-1,#111);">Session Interrupted</h2>
          <p style="font-size:0.9rem;color:var(--crm-text-2,#555);margin:0 0 18px;">
            Your session was ended (terminated or timed out). You have
            <strong>{{ guard.secondsLeft() }}s</strong> to continue, or you'll be logged out automatically.
          </p>
          <div style="display:flex;gap:12px;justify-content:center;">
            <button (click)="guard.logoutNow()"
                    style="padding:10px 20px;border-radius:8px;border:1px solid var(--crm-border,#ddd);background:none;color:var(--crm-text-1,#111);cursor:pointer;font-weight:600;">
              Logout
            </button>
            <button (click)="guard.continueSession()" [disabled]="guard.resuming()"
                    style="padding:10px 20px;border-radius:8px;border:none;background:#2563eb;color:#fff;cursor:pointer;font-weight:600;opacity:{{ guard.resuming() ? 0.7 : 1 }};">
              {{ guard.resuming() ? 'Resuming…' : 'Continue Session' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SessionGuardModalComponent {
  readonly guard = inject(SessionGuardService);
}
