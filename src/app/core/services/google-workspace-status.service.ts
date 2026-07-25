import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { AppConfigService } from './app-config.service';

export interface GoogleWorkspaceStatus {
  connected: boolean;
  email?: string;
  needsReconnect?: boolean;
  connectedAt?: string;
  lastTokenRefreshAt?: string;
  lastApiSuccessAt?: string;
  services?: { gmail?: boolean; calendar?: boolean; meet?: boolean; tasks?: boolean };
}

/**
 * Each individual user (in any tenant) connects their own separate Google account —
 * the backend keys google_workspace_credentials by username, not by tenant. This
 * service caches that per-user status so it's fetched once at login rather than
 * separately by every feature (Settings, Tasks, Calendar, Email) that needs it.
 */
@Injectable({ providedIn: 'root' })
export class GoogleWorkspaceStatusService {
  private readonly http = inject(HttpClient);
  private readonly cfg = inject(AppConfigService);

  readonly status = signal<GoogleWorkspaceStatus | null>(null);
  readonly loading = signal(false);

  // Reads localStorage directly (rather than injecting AuthService) since AuthService's
  // own login/SSO success path calls refresh() here — injecting it back would cycle.
  private hdrs(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const orgId = JSON.parse(localStorage.getItem('crmUser') ?? 'null')?.organizationId;
      if (orgId) headers['X-Organization-Id'] = orgId;
    } catch { /* no-op */ }
    return new HttpHeaders(headers);
  }

  refresh(): void {
    this.loading.set(true);
    this.http.get<GoogleWorkspaceStatus>(`${this.cfg.crmApiUrl}/api/v1/google/auth/status`, { headers: this.hdrs() })
      .subscribe({
        next: status => {
          this.status.set(status);
          this.loading.set(false);
        },
        error: () => {
          this.status.set({ connected: false });
          this.loading.set(false);
        }
      });
  }
}
