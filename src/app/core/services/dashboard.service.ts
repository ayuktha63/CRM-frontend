import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface DashboardSummaryResponse {
  totalContacts: number;
  totalLeads: number;
  hotLeads: number;
  tasksDueToday: number;
  revenueGenerated: number;
  pipelineValue: number;
  totalCampaigns: number;
  emailsSent: number;
  emailsOpened: number;
  emailsReplied: number;
}

export interface SalesUserOption {
  username: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  private readonly base = `http://${globalThis.location.hostname}:8085/api/v1/reports`;

  private hdrs(): HttpHeaders {
    const token = localStorage.getItem('accessToken') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getDashboardSummary(username?: string | null): Observable<DashboardSummaryResponse> {
    const params = username ? `?username=${encodeURIComponent(username)}` : '';
    return this.http.get<DashboardSummaryResponse>(`${this.base}/dashboard${params}`, {
      headers: this.hdrs()
    });
  }

  getSalesUsers(): Observable<SalesUserOption[]> {
    return this.http.get<SalesUserOption[]>(`${this.base}/admin/users`, {
      headers: this.hdrs()
    });
  }
}
