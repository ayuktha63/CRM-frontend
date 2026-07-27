import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';
import { AppConfigService } from '../../core/services/app-config.service';
import { GoogleWorkspaceStatusService } from '../../core/services/google-workspace-status.service';
import { OToastService } from 'orque-ui';

interface PersonalSettings {
  id?: number;
  notifyTaskDue?: boolean;
  notifyDealStageChange?: boolean;
  notifyLeadAssigned?: boolean;
  notifyQuoteApproved?: boolean;
  notifyInvoicePaid?: boolean;
  notifyFollowupReminder?: boolean;
  defaultPrinter?: string;
  quoteSeriesPrefix?: string;
  quoteNextNumber?: number;
  invoiceSeriesPrefix?: string;
  invoiceNextNumber?: number;
}

interface EmailLog {
  id: number;
  toEmail: string;
  subject: string;
  status: string;
  sentAt: string;
}

/** This user's own connection to a single unified Google OAuth grant covering
 *  Gmail, Calendar/Meet, and Tasks — see GoogleWorkspaceStatusService. */

@Component({
  selector: 'app-personal-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-settings.html',
  styleUrl: './user-settings.scss'
})
export class PersonalSettingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly cfg = inject(AppConfigService);
  private readonly toast = inject(OToastService);
  readonly googleStatusService = inject(GoogleWorkspaceStatusService);

  activeSection = signal<'license' | 'general' | 'notifications' | 'integrations' | 'printing' | 'logs'>('license');
  setSection(section: 'license' | 'general' | 'notifications' | 'integrations' | 'printing' | 'logs'): void {
    this.activeSection.set(section);
  }

  licenseLoading = signal(true);
  licenseError = signal<string | null>(null);
  license = signal<any>(null);

  settingsLoading = signal(true);
  settingsSaving = signal(false);
  settingsSaveSuccess = signal(false);
  settings: PersonalSettings = {};

  prefsSaving = signal(false);
  prefsSaveSuccess = signal(false);
  prefs = {
    dateFormat: localStorage.getItem('crm_date_format') ?? 'DD/MM/YYYY',
    timezone: localStorage.getItem('crm_timezone') ?? 'Asia/Kolkata',
    pageSize: localStorage.getItem('crm_page_size') ?? '25'
  };

  detectedPrinters = signal<string[]>([]);
  scanningPrinters = signal(false);
  scanProgress = signal(0);

  emailLogs = signal<EmailLog[]>([]);
  loadingLogs = signal(true);

  connectingGoogle = signal(false);
  googleStatus = () => this.googleStatusService.status();
  googleServiceList = () => {
    const services = this.googleStatus()?.services ?? {};
    return [
      { key: 'gmail', label: 'Gmail', granted: !!services.gmail },
      { key: 'calendar', label: 'Calendar', granted: !!services.calendar },
      { key: 'meet', label: 'Google Meet (via Calendar)', granted: !!services.meet },
      { key: 'tasks', label: 'Google Tasks', granted: !!services.tasks }
    ];
  };

  private hdrs(): HttpHeaders {
    const token = this.auth.getAccessToken();
    const orgId = this.auth.getOrganizationId();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['X-Organization-Id'] = orgId;
    return new HttpHeaders(headers);
  }

  ngOnInit(): void {
    this.http.get<any>(`${this.cfg.crmApiUrl}/api/v1/license/my-seat`, { headers: this.hdrs() })
      .subscribe({
        next: res => { this.license.set(res); this.licenseLoading.set(false); },
        error: err => {
          this.licenseError.set(err?.error?.message || 'Could not load license information.');
          this.licenseLoading.set(false);
        }
      });

    this.loadSettings();
    this.loadPrinters();
    this.loadLogs();

    // Reuse the login-time prefetch if it already landed; otherwise fetch now.
    if (!this.googleStatusService.status()) {
      this.googleStatusService.refresh();
    }
    this.handleGoogleRedirect();
  }

  /** Single OAuth connection covers Gmail, Calendar/Meet, and Tasks — one redirect handles all of them. */
  private handleGoogleRedirect(): void {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google');
    if (!status) return;
    if (status === 'connected') {
      this.googleStatusService.refresh();
      this.toast.addSuccess('Google connected', 'Gmail, Calendar, Meet, and Tasks are now linked.');
    } else if (status === 'error') {
      const reason = params.get('reason');
      const reasonMessages: Record<string, string> = {
        invalid_state: 'The connection request expired or was tampered with — please try again.',
        unknown_user: 'Could not identify your CRM account — please log in again and retry.',
        exchange_failed: 'Google rejected the authorization — please try connecting again.'
      };
      const message = (reason && reasonMessages[reason]) || 'Something went wrong while connecting to Google.';
      this.toast.addError('Google connection failed', message);
    }
    window.history.replaceState({}, '', window.location.pathname);
  }

  connectGoogle(): void {
    this.connectingGoogle.set(true);
    this.http.get<{ url: string }>(`${this.cfg.crmApiUrl}/api/v1/google/auth/url`, { headers: this.hdrs() })
      .subscribe({
        next: res => { window.location.href = res.url; },
        error: () => {
          this.connectingGoogle.set(false);
          this.toast.addError('Could not start Google connection', 'Please try again in a moment.');
        }
      });
  }

  disconnectGoogle(): void {
    this.http.post(`${this.cfg.crmApiUrl}/api/v1/google/auth/disconnect`, {}, { headers: this.hdrs() })
      .subscribe({
        next: () => {
          this.googleStatusService.status.set({ connected: false });
          this.toast.addSuccess('Disconnected', 'Google Workspace has been disconnected.');
        },
        error: () => this.toast.addError('Disconnect failed', 'Could not disconnect Google. Please try again.')
      });
  }

  private loadSettings(): void {
    this.settingsLoading.set(true);
    this.http.get<PersonalSettings>(`${this.cfg.crmApiUrl}/api/v1/user-settings`, { headers: this.hdrs() })
      .subscribe({
        next: res => { this.settings = res ?? {}; this.settingsLoading.set(false); },
        error: () => { this.settingsLoading.set(false); }
      });
  }

  saveSettings(): void {
    this.settingsSaving.set(true);
    this.http.put<PersonalSettings>(`${this.cfg.crmApiUrl}/api/v1/user-settings`, this.settings, { headers: this.hdrs() })
      .subscribe({
        next: res => {
          this.settings = res ?? this.settings;
          this.settingsSaving.set(false);
          this.settingsSaveSuccess.set(true);
          setTimeout(() => this.settingsSaveSuccess.set(false), 2000);
        },
        error: () => { this.settingsSaving.set(false); }
      });
  }

  loadPrinters(): void {
    this.http.get<string[]>(`${this.cfg.crmApiUrl}/api/v1/user-settings/detected-printers`, { headers: this.hdrs() })
      .subscribe({
        next: printers => this.detectedPrinters.set(printers ?? []),
        error: () => this.detectedPrinters.set([])
      });
  }

  startPrinterScan(): void {
    if (this.scanningPrinters()) return;
    this.scanningPrinters.set(true);
    this.scanProgress.set(0);

    const duration = 1500;
    const intervalTime = 30;
    const increment = 100 / (duration / intervalTime);
    let currentProgress = 0;

    const timer = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 100) {
        clearInterval(timer);
        this.http.get<string[]>(`${this.cfg.crmApiUrl}/api/v1/user-settings/detected-printers`, { headers: this.hdrs() })
          .subscribe({
            next: printers => {
              const previousCount = this.detectedPrinters().length;
              this.detectedPrinters.set(printers ?? []);
              this.scanningPrinters.set(false);
              this.scanProgress.set(0);
              const diff = (printers?.length ?? 0) - previousCount;
              if (diff > 0) this.toast.addSuccess('Scan Complete', `Found ${diff} new print device(s).`);
              else this.toast.addInfo('Scan Complete', 'No new printer devices found.');
            },
            error: () => {
              this.scanningPrinters.set(false);
              this.scanProgress.set(0);
              this.toast.addInfo('Scan Complete', 'No new printer devices found.');
            }
          });
      } else {
        this.scanProgress.set(Math.round(currentProgress));
      }
    }, intervalTime);
  }

  loadLogs(): void {
    this.loadingLogs.set(true);
    this.http.get<EmailLog[]>(`${this.cfg.crmApiUrl}/api/v1/emails/logs`, { headers: this.hdrs() })
      .subscribe({
        next: logs => { this.emailLogs.set(logs ?? []); this.loadingLogs.set(false); },
        error: () => { this.emailLogs.set([]); this.loadingLogs.set(false); }
      });
  }

  savePrefs(): void {
    this.prefsSaving.set(true);
    localStorage.setItem('crm_date_format', this.prefs.dateFormat);
    localStorage.setItem('crm_timezone', this.prefs.timezone);
    localStorage.setItem('crm_page_size', this.prefs.pageSize);
    setTimeout(() => {
      this.prefsSaving.set(false);
      this.prefsSaveSuccess.set(true);
      setTimeout(() => this.prefsSaveSuccess.set(false), 2000);
    }, 300);
  }

  formatDate(d: any): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return String(d); }
  }
}
