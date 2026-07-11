import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrls: ['../login/login.scss']
})
export class ResetPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  maskedEmail = '';
  username = '';
  tenantName = '';
  checkingToken = true;
  tokenInvalid = false;
  tokenExpired = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.tokenInvalid = true;
      this.checkingToken = false;
      return;
    }

    this.authService.validateResetToken(this.token).subscribe({
      next: (res) => {
        this.checkingToken = false;
        if (res.valid) {
          this.username = res.username || '';
          this.tenantName = res.tenantName || '';
          this.maskedEmail = res.maskedEmail || '';
        } else if (res.reason === 'expired') {
          this.tokenExpired = true;
        } else {
          this.tokenInvalid = true;
        }
      },
      error: () => {
        this.checkingToken = false;
        this.tokenInvalid = true;
      }
    });
  }

  submit(): void {
    this.errorMessage = '';

    if (!this.token || this.tokenInvalid || this.tokenExpired) {
      this.errorMessage = 'This reset link is invalid. Please request a new one.';
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Please fill in both password fields.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message || 'Your password has been reset successfully.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'This reset link is invalid or has expired. Please request a new one.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
