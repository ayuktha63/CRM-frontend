import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  OrganizationService,
  LicenseStatusResponse,
  LicenseActivationRequest,
  LicenseGenerateRequest
} from '../../core/services/organization.service';

@Component({
  selector: 'app-license-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="license-page">
      <div class="page-header">
        <h1>License Management</h1>
        <p class="subtitle">View and manage your organization's license</p>
      </div>

      <!-- Current license status -->
      <div class="card status-card">
        <div class="card-header">
          <h2>Current License Status</h2>
          <button class="btn-icon" (click)="loadStatus()">⟳</button>
        </div>

        @if (statusLoading()) {
          <div class="loading">Loading…</div>
        } @else if (status()) {
          <div class="status-grid">
            <div class="stat">
              <span class="stat-label">Status</span>
              <span class="stat-value status-badge" [class]="'lic-' + (status()!.status ?? 'unknown').toLowerCase()">
                {{ status()!.status ?? 'Unknown' }}
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">Expiry Date</span>
              <span class="stat-value">{{ status()!.endDate ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Days Remaining</span>
              <span class="stat-value" [class.warn]="(status()!.daysRemaining ?? 0) < 30">
                {{ status()!.daysRemaining ?? '—' }}
              </span>
            </div>
            @if (status()!.inGracePeriod) {
              <div class="stat">
                <span class="stat-label">Grace Days Left</span>
                <span class="stat-value warn">{{ status()!.graceRemaining }}</span>
              </div>
            }
            <div class="stat">
              <span class="stat-label">Max Users</span>
              <span class="stat-value">{{ status()!.maximumUsers ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Current Users</span>
              <span class="stat-value">{{ status()!.currentUserCount ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Concurrent Limit</span>
              <span class="stat-value">{{ status()!.concurrentUsers ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Active Sessions</span>
              <span class="stat-value">{{ status()!.activeSessionCount ?? '—' }}</span>
            </div>
          </div>

          @if (status()!.inGracePeriod) {
            <div class="grace-banner">
              <span class="warn-icon">⚠</span>
              Your license has expired and is in grace period.
              <strong>{{ status()!.graceRemaining }} day(s)</strong> remaining. Please renew immediately.
            </div>
          }
        } @else {
          <div class="empty-state">No license configured for your organization.</div>
        }
      </div>

      <!-- Activate license -->
      <div class="card activate-card">
        <h2>Activate License Key</h2>
        <form [formGroup]="activateForm" (ngSubmit)="activateLicense()" class="activate-form">
          <div class="form-field">
            <label>Organization ID *</label>
            <input formControlName="organizationId" placeholder="e.g. SYSTEM or Organization UUID" />
            @if (activateForm.get('organizationId')?.invalid && activateForm.get('organizationId')?.touched) {
              <span class="error">Organization ID is required</span>
            }
          </div>
          <div class="form-field">
            <label>License Name</label>
            <input formControlName="licenseName" placeholder="e.g. Enterprise 2025" />
          </div>
          <div class="form-field">
            <label>License Key *</label>
            <textarea formControlName="licenseKey" rows="4"
              placeholder="Paste the license key here (XXXXXXXX-XXXXXXXX-…)"></textarea>
            @if (activateForm.get('licenseKey')?.invalid && activateForm.get('licenseKey')?.touched) {
              <span class="error">License key is required</span>
            }
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="activateForm.invalid || activating()">
              {{ activating() ? 'Activating…' : 'Activate License' }}
            </button>
          </div>
          @if (activateError()) {
            <p class="error-banner">{{ activateError() }}</p>
          }
          @if (activateSuccess()) {
            <p class="success-banner">License activated successfully!</p>
          }
        </form>
      </div>

      <!-- Generate license key (SYSTEM_ADMIN only) -->
      <div class="card generate-card">
        <h2>Generate License Key <span class="badge-sysadmin">SYSTEM ADMIN</span></h2>
        <form [formGroup]="generateForm" (ngSubmit)="generateKey()" class="generate-form">
          <div class="form-row">
            <div class="form-field">
              <label>Organization Code *</label>
              <input formControlName="orgCode" placeholder="ACME" />
            </div>
            <div class="form-field">
              <label>Start Date *</label>
              <input formControlName="startDate" type="date" />
            </div>
            <div class="form-field">
              <label>End Date *</label>
              <input formControlName="endDate" type="date" />
            </div>
            <div class="form-field">
              <label>Grace Period (days)</label>
              <input formControlName="gracePeriodDays" type="number" placeholder="30" />
            </div>
            <div class="form-field">
              <label>Max Users</label>
              <input formControlName="maxUsers" type="number" placeholder="10" />
            </div>
            <div class="form-field">
              <label>Concurrent Users</label>
              <input formControlName="concurrentUsers" type="number" placeholder="5" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="generateForm.invalid || generating()">
              {{ generating() ? 'Generating…' : 'Generate Key' }}
            </button>
          </div>
          @if (generatedKey()) {
            <div class="key-result">
              <label>Generated License Key (copy and share securely):</label>
              <code>{{ generatedKey() }}</code>
              <button type="button" class="btn-copy" (click)="copyKey()">Copy</button>
            </div>
          }
          @if (generateError()) {
            <p class="error-banner">{{ generateError() }}</p>
          }
        </form>
      </div>
    </div>
  `,
  styles: [`
    .license-page { padding: 24px; max-width: 900px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 600; margin: 0; }
    .subtitle { color: var(--text-secondary, #666); margin: 4px 0 0; }
    .card { background: var(--surface, #fff); border-radius: 12px; border: 1px solid var(--border, #e5e7eb); padding: 24px; margin-bottom: 24px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
    .btn-icon { background: none; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 16px; }
    .status-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
    .stat { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 11px; font-weight: 500; text-transform: uppercase; color: var(--text-secondary, #9ca3af); }
    .stat-value { font-size: 16px; font-weight: 600; }
    .stat-value.warn { color: #d97706; }
    .status-badge { padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; display: inline-block; }
    .lic-active { background: #dcfce7; color: #166534; }
    .lic-grace { background: #fef3c7; color: #92400e; }
    .lic-expired { background: #fee2e2; color: #991b1b; }
    .lic-suspended { background: #f3f4f6; color: #374151; }
    .lic-unknown { background: #f3f4f6; color: #6b7280; }
    .grace-banner { margin-top: 16px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #92400e; display: flex; align-items: center; gap: 8px; }
    .warn-icon { font-size: 18px; }
    .loading, .empty-state { text-align: center; padding: 24px; color: var(--text-secondary, #9ca3af); }
    h2 { font-size: 16px; font-weight: 600; margin: 0 0 16px; }
    .form-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .form-field label { font-size: 12px; font-weight: 500; color: var(--text-secondary, #666); }
    .form-field input, .form-field textarea { border: 1px solid var(--border, #d1d5db); border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; resize: vertical; }
    .form-field input:focus, .form-field textarea:focus { border-color: var(--primary, #0F3460); box-shadow: 0 0 0 2px rgba(15,52,96,.15); }
    .error { color: #ef4444; font-size: 11px; }
    .form-actions { margin-top: 4px; }
    .btn-primary { background: var(--primary, #0F3460); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .error-banner { color: #ef4444; margin-top: 8px; font-size: 13px; }
    .success-banner { color: #166534; margin-top: 8px; font-size: 13px; }
    .badge-sysadmin { font-size: 10px; font-weight: 600; background: #E8EDF5; color: #0F3460; padding: 2px 8px; border-radius: 999px; vertical-align: middle; margin-left: 8px; }
    .key-result { margin-top: 16px; background: #f8fafc; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 16px; }
    .key-result label { font-size: 12px; font-weight: 500; color: var(--text-secondary, #666); display: block; margin-bottom: 8px; }
    .key-result code { display: block; word-break: break-all; font-family: monospace; font-size: 13px; background: #1e1e2e; color: #a6e3a1; padding: 12px; border-radius: 6px; margin-bottom: 8px; }
    .btn-copy { background: var(--surface, #fff); border: 1px solid var(--border, #d1d5db); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
  `]
})
export class LicensePageComponent implements OnInit {
  private readonly orgSvc = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  status = signal<LicenseStatusResponse | null>(null);
  statusLoading = signal(false);
  activating = signal(false);
  activateError = signal<string | null>(null);
  activateSuccess = signal(false);
  generating = signal(false);
  generatedKey = signal<string | null>(null);
  generateError = signal<string | null>(null);

  activateForm = this.fb.group({
    organizationId: ['SYSTEM', Validators.required],
    licenseName: [''],
    licenseKey: ['', Validators.required]
  });

  generateForm = this.fb.group({
    orgCode: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    gracePeriodDays: [30],
    maxUsers: [10],
    concurrentUsers: [5]
  });

  ngOnInit(): void {
    this.loadStatus();
  }

  loadStatus(): void {
    this.statusLoading.set(true);
    this.orgSvc.getMyLicenseStatus().subscribe({
      next: s => { this.status.set(s); this.statusLoading.set(false); },
      error: () => { this.status.set(null); this.statusLoading.set(false); }
    });
  }

  activateLicense(): void {
    if (this.activateForm.invalid) return;
    this.activating.set(true);
    this.activateError.set(null);
    this.activateSuccess.set(false);

    const req: LicenseActivationRequest = {
      organizationId: this.activateForm.value.organizationId!,
      licenseKey: this.activateForm.value.licenseKey!,
      licenseName: this.activateForm.value.licenseName ?? 'My License'
    };

    this.orgSvc.activateLicense(req).subscribe({
      next: s => {
        const features = s.features || [];
        localStorage.setItem('accesspolicy', JSON.stringify(features));
        if (s.organizationId === 'SYSTEM') {
          window.location.href = '/dashboard';
        } else {
          this.status.set(s);
          this.activateForm.reset({ organizationId: 'SYSTEM', licenseName: '', licenseKey: '' });
          this.activateSuccess.set(true);
          this.activating.set(false);
        }
      },
      error: err => {
        this.activateError.set(err?.error?.message ?? 'Failed to activate license');
        this.activating.set(false);
      }
    });
  }

  generateKey(): void {
    if (this.generateForm.invalid) return;
    this.generating.set(true);
    this.generateError.set(null);
    this.generatedKey.set(null);

    const v = this.generateForm.value;
    const req: LicenseGenerateRequest = {
      orgCode: v.orgCode!,
      startDate: v.startDate!,
      endDate: v.endDate!,
      gracePeriodDays: v.gracePeriodDays ?? 30,
      maxUsers: v.maxUsers ?? 10,
      concurrentUsers: v.concurrentUsers ?? 5
    };

    this.orgSvc.generateLicenseKey(req).subscribe({
      next: res => {
        this.generatedKey.set(res.licenseKey);
        this.generating.set(false);
      },
      error: err => {
        this.generateError.set(err?.error?.message ?? 'Failed to generate key');
        this.generating.set(false);
      }
    });
  }

  copyKey(): void {
    const key = this.generatedKey();
    if (key) navigator.clipboard.writeText(key);
  }
}
