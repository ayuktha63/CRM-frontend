import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-sso',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;font-family:sans-serif;">
      @if (error) {
        <div style="color:#dc2626;font-size:1rem;">{{ error }}</div>
        <a href="/login" style="color:#0F3460;text-decoration:underline;">Back to Login</a>
      } @else {
        <div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#0F3460;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <span style="color:#6b7280;font-size:0.9rem;">Signing you in...</span>
      }
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  `
})
export class SsoComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private auth   = inject(AuthService);

  error = '';

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error = 'No SSO token provided.';
      return;
    }
    this.auth.ssoLogin(token).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err?.error?.message || 'SSO login failed. Please try logging in manually.';
      }
    });
  }
}
