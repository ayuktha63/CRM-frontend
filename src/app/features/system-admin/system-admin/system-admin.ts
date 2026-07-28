import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  OrganizationService,
  OrganizationResponse,
  OrganizationRequest
} from '../../../core/services/organization.service';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './system-admin.html',
  styleUrl: './system-admin.scss'
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
