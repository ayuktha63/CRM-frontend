import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';
import { AppConfigService } from '../../../core/services/app-config.service';

@Component({
  selector: 'app-sso',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;font-family:sans-serif;">
      @if (error) {
        <div style="color:#dc2626;font-size:1rem;">{{ error }}</div>
        <a href="/login" style="color:#4f46e5;text-decoration:underline;">Back to Login</a>
      } @else {
        <div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#4f46e5;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <span style="color:#6b7280;font-size:0.9rem;">Signing you in...</span>
      }
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  `
})
export class SsoComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private http   = inject(HttpClient);
  private auth   = inject(AuthService);
  private readonly cfg = inject(AppConfigService);

  error = '';

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error = 'No SSO token provided.';
      return;
    }
    this.http.post<any>(`${this.cfg.crmApiUrl}/api/v1/auth/sso`, { token }).subscribe({
      next: (res) => {
        // Always wipe stale license state from previous sessions before setting new tokens
        localStorage.removeItem('licenseStatus');
        localStorage.removeItem('accesspolicy');

        localStorage.setItem('accessToken',  res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('crmUser', JSON.stringify({
          name: res.username,
          email: res.email,
          role: res.role,
          licenseWarning: res.licenseWarning ?? null,
          tenantName: res.tenantName ?? null
        }));
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err?.error?.message || 'SSO login failed. Please try logging in manually.';
      }
    });
  }
}
