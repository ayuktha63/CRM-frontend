import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-sso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sso.html',
  styleUrl: './sso.scss'
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
