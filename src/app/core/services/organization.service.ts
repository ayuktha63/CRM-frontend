import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { AppConfigService } from './app-config.service';

export interface OrganizationResponse {
  id: string;
  organizationCode: string;
  organizationName: string;
  legalName?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt?: string;
  license?: {
    status: string;
    endDate?: string;
    daysRemaining?: number;
    maxUsers?: number;
    concurrentUsers?: number;
  };
}

export interface OrganizationRequest {
  organizationCode: string;
  organizationName: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
}

export interface LicenseStatusResponse {
  organizationId: string;
  licenseName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  daysRemaining?: number;
  graceRemaining?: number;
  inGracePeriod?: boolean;
  maximumUsers?: number;
  concurrentUsers?: number;
  activeSessionCount?: number;
  currentUserCount?: number;
  features?: string[];
}

export interface LicenseActivationRequest {
  organizationId: string;
  licenseKey: string;
  licenseName: string;
}

export interface LicenseGenerateRequest {
  orgCode: string;
  startDate: string;
  endDate: string;
  gracePeriodDays?: number;
  maxUsers?: number;
  concurrentUsers?: number;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly cfg  = inject(AppConfigService);

  private get orgBase(): string { return `${this.cfg.crmApiUrl}/api/v1/organizations`; }
  private get licBase(): string { return `${this.cfg.crmApiUrl}/api/v1/license`; }

  private hdrs(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getAccessToken()}` });
  }

  listOrganizations(): Observable<OrganizationResponse[]> {
    return this.http.get<OrganizationResponse[]>(this.orgBase, { headers: this.hdrs() });
  }

  createOrganization(req: OrganizationRequest): Observable<OrganizationResponse> {
    return this.http.post<OrganizationResponse>(this.orgBase, req, { headers: this.hdrs() });
  }

  suspendOrganization(id: string): Observable<OrganizationResponse> {
    return this.http.post<OrganizationResponse>(`${this.orgBase}/${id}/suspend`, {}, { headers: this.hdrs() });
  }

  activateOrganization(id: string): Observable<OrganizationResponse> {
    return this.http.post<OrganizationResponse>(`${this.orgBase}/${id}/activate`, {}, { headers: this.hdrs() });
  }

  getMyLicenseStatus(): Observable<LicenseStatusResponse> {
    return this.http.get<LicenseStatusResponse>(`${this.licBase}/status/me`, { headers: this.hdrs() });
  }

  getLicenseStatus(orgId: string): Observable<LicenseStatusResponse> {
    return this.http.get<LicenseStatusResponse>(`${this.licBase}/status/${orgId}`, { headers: this.hdrs() });
  }

  activateLicense(req: LicenseActivationRequest): Observable<LicenseStatusResponse> {
    return this.http.post<LicenseStatusResponse>(`${this.licBase}/activate`, req, { headers: this.hdrs() });
  }

  generateLicenseKey(req: LicenseGenerateRequest): Observable<{ licenseKey: string }> {
    return this.http.post<{ licenseKey: string }>(`${this.licBase}/generate`, req, { headers: this.hdrs() });
  }
}
