import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  OrganizationService,
  LicenseStatusResponse,
  LicenseActivationRequest,
  LicenseGenerateRequest
} from '../../../core/services/organization.service';

@Component({
  selector: 'app-license-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './license-page.html',
  styleUrl: './license-page.scss'
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
