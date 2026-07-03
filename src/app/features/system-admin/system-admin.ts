import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  OrganizationService,
  OrganizationResponse,
  OrganizationRequest
} from '../../core/services/organization.service';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="sys-admin-page">
      <div class="page-header">
        <h1>System Administration</h1>
        <p class="subtitle">Manage all organizations on the platform</p>
      </div>

      <!-- Create organization panel -->
      <div class="card create-card">
        <h2>Create Organization</h2>
        <form [formGroup]="createForm" (ngSubmit)="createOrg()" class="create-form">
          <div class="form-row">
            <div class="form-field">
              <label>Organization Code *</label>
              <input formControlName="organizationCode" placeholder="e.g. ACME" />
              @if (createForm.get('organizationCode')?.invalid && createForm.get('organizationCode')?.touched) {
                <span class="error">Required</span>
              }
            </div>
            <div class="form-field">
              <label>Organization Name *</label>
              <input formControlName="organizationName" placeholder="Acme Corp" />
              @if (createForm.get('organizationName')?.invalid && createForm.get('organizationName')?.touched) {
                <span class="error">Required</span>
              }
            </div>
            <div class="form-field">
              <label>Email</label>
              <input formControlName="email" type="email" placeholder="contact@acme.com" />
            </div>
            <div class="form-field">
              <label>Phone</label>
              <input formControlName="phone" placeholder="+1 555 000 0000" />
            </div>
            <div class="form-field">
              <label>Country</label>
              <input formControlName="country" placeholder="US" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="createForm.invalid || creating()">
              {{ creating() ? 'Creating…' : 'Create Organization' }}
            </button>
          </div>
          @if (createError()) {
            <p class="error-banner">{{ createError() }}</p>
          }
        </form>
      </div>

      <!-- Organization list -->
      <div class="card list-card">
        <div class="list-header">
          <h2>Organizations ({{ orgs().length }})</h2>
          <button class="btn-icon" (click)="loadOrgs()" title="Refresh">⟳</button>
        </div>

        @if (loading()) {
          <div class="loading">Loading…</div>
        } @else if (orgs().length === 0) {
          <div class="empty-state">No organizations found.</div>
        } @else {
          <div class="org-table-wrapper">
            <table class="org-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>License</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (org of orgs(); track org.id) {
                  <tr [class.suspended]="org.status === 'SUSPENDED'">
                    <td><code>{{ org.id }}</code></td>
                    <td><code>{{ org.organizationCode }}</code></td>
                    <td>{{ org.organizationName }}</td>
                    <td>{{ org.email ?? '—' }}</td>
                    <td>
                      <span class="status-badge" [class]="'status-' + org.status.toLowerCase()">
                        {{ org.status }}
                      </span>
                    </td>
                    <td>
                      @if (org.license) {
                        <span class="license-status" [class]="'lic-' + org.license.status.toLowerCase()">
                          {{ org.license.status }}
                          @if (org.license.daysRemaining != null) {
                            <span class="days">({{ org.license.daysRemaining }}d)</span>
                          }
                        </span>
                      } @else {
                        <span class="no-license">No license</span>
                      }
                    </td>
                    <td class="actions">
                      @if (org.status === 'ACTIVE') {
                        <button class="btn-danger-sm" (click)="suspend(org)" [disabled]="actioning()">
                          Suspend
                        </button>
                      } @else {
                        <button class="btn-success-sm" (click)="activate(org)" [disabled]="actioning()">
                          Activate
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sys-admin-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 600; margin: 0; }
    .subtitle { color: var(--text-secondary, #666); margin: 4px 0 0; }
    .card { background: var(--surface, #fff); border-radius: 12px; border: 1px solid var(--border, #e5e7eb); padding: 24px; margin-bottom: 24px; }
    .create-form .form-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 4px; }
    .form-field label { font-size: 12px; font-weight: 500; color: var(--text-secondary, #666); }
    .form-field input { border: 1px solid var(--border, #d1d5db); border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }
    .form-field input:focus { border-color: var(--primary, #6366f1); box-shadow: 0 0 0 2px rgba(99,102,241,.15); }
    .error { color: #ef4444; font-size: 11px; }
    .form-actions { margin-top: 16px; }
    .btn-primary { background: var(--primary, #6366f1); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .error-banner { color: #ef4444; margin-top: 8px; font-size: 13px; }
    .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .list-header h2 { font-size: 16px; font-weight: 600; margin: 0; }
    .btn-icon { background: none; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 16px; }
    .loading, .empty-state { text-align: center; padding: 32px; color: var(--text-secondary, #666); }
    .org-table-wrapper { overflow-x: auto; }
    .org-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .org-table th { text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; color: var(--text-secondary, #666); border-bottom: 1px solid var(--border, #e5e7eb); }
    .org-table td { padding: 12px; border-bottom: 1px solid var(--border-light, #f3f4f6); vertical-align: middle; }
    .org-table tr.suspended td { opacity: .6; }
    .status-badge { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
    .status-active { background: #dcfce7; color: #166534; }
    .status-suspended { background: #fee2e2; color: #991b1b; }
    .license-status { font-size: 12px; font-weight: 500; }
    .lic-active { color: #166534; }
    .lic-grace { color: #92400e; }
    .lic-expired { color: #991b1b; }
    .no-license { color: var(--text-secondary, #9ca3af); font-size: 12px; font-style: italic; }
    .days { font-weight: 400; margin-left: 4px; }
    .actions { display: flex; gap: 8px; }
    .btn-danger-sm { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .btn-success-sm { background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .btn-danger-sm:disabled, .btn-success-sm:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class SystemAdminComponent implements OnInit {
  private readonly orgSvc = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  orgs = signal<OrganizationResponse[]>([]);
  loading = signal(false);
  actioning = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);

  createForm = this.fb.group({
    organizationCode: ['', Validators.required],
    organizationName: ['', Validators.required],
    email: [''],
    phone: [''],
    country: ['']
  });

  ngOnInit(): void {
    this.loadOrgs();
  }

  loadOrgs(): void {
    this.loading.set(true);
    this.orgSvc.listOrganizations().subscribe({
      next: data => { this.orgs.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  createOrg(): void {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    this.createError.set(null);
    const req = this.createForm.value as OrganizationRequest;
    this.orgSvc.createOrganization(req).subscribe({
      next: org => {
        this.orgs.update(list => [org, ...list]);
        this.createForm.reset();
        this.creating.set(false);
      },
      error: err => {
        this.createError.set(err?.error?.message ?? 'Failed to create organization');
        this.creating.set(false);
      }
    });
  }

  suspend(org: OrganizationResponse): void {
    this.actioning.set(true);
    this.orgSvc.suspendOrganization(org.id).subscribe({
      next: updated => { this.replaceOrg(updated); this.actioning.set(false); },
      error: () => this.actioning.set(false)
    });
  }

  activate(org: OrganizationResponse): void {
    this.actioning.set(true);
    this.orgSvc.activateOrganization(org.id).subscribe({
      next: updated => { this.replaceOrg(updated); this.actioning.set(false); },
      error: () => this.actioning.set(false)
    });
  }

  private replaceOrg(updated: OrganizationResponse): void {
    this.orgs.update(list => list.map(o => o.id === updated.id ? updated : o));
  }
}
