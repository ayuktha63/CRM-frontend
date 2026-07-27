import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';
import { AppConfigService } from '../../../core/services/app-config.service';
import { OToastService } from 'orque-ui';

interface GoogleWorkspaceStatus {
  connected: boolean;
  email?: string;
  needsReconnect?: boolean;
  connectedAt?: string;
  lastTokenRefreshAt?: string;
  lastApiSuccessAt?: string;
  services?: { gmail?: boolean; calendar?: boolean; meet?: boolean; tasks?: boolean };
}

interface TaxCountry {
  countryCode: string;
  countryName: string;
  taxSystem: string;
  registrationLabel: string;
  requiresBusinessState: boolean;
  sameStateComponents: { name: string; rate: number }[] | null;
  differentStateComponents: { name: string; rate: number }[] | null;
  flatComponents: { name: string; rate: number }[] | null;
}

@Component({
  selector: 'app-sysadmin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sysadmin-settings.html',
  styleUrl: './sysadmin-settings.scss'
})
export class SysadminSettingsComponent implements OnInit {
  private readonly http    = inject(HttpClient);
  private readonly auth    = inject(AuthService);
  private readonly cfg     = inject(AppConfigService);
  private readonly toast   = inject(OToastService);

  activeSection = signal<'license' | 'billing' | 'tax' | 'numbering' | 'general' | 'notifications' | 'integrations'>('license');

  setSection(section: 'license' | 'billing' | 'tax' | 'numbering' | 'general' | 'notifications' | 'integrations'): void {
    this.activeSection.set(section);
  }

  licenseLoading = signal(true);
  licenseError   = signal<string | null>(null);
  license        = signal<any>(null);

  saving      = signal(false);
  saveSuccess = signal(false);

  billingLoading     = signal(true);
  billingError       = signal<string | null>(null);
  billingSaving      = signal(false);
  billingSaveSuccess = signal(false);

  billingForm = {
    legalName: '', email: '', phone: '', address: '', gstin: '',
    companyTagline: '', bankName: '', bankAccountNumber: '', bankIfsc: '',
    upiId: '', paymentTermsDays: 30, lateFeeText: ''
  };

  taxLoading     = signal(true);
  taxError       = signal<string | null>(null);
  taxSaving      = signal(false);
  taxSaveSuccess = signal(false);
  taxCountries   = signal<TaxCountry[]>([]);

  taxForm = {
    countryCode: '', countryName: '', taxSystem: '', registrationLabel: '',
    registrationNumber: '', businessState: '', requiresBusinessState: false, configJson: ''
  };

  /** Canonical Indian states/UTs — kept identical to the customerState options in
   * quotes.json/invoices.json so businessState and customerState can only ever match
   * on an exact, typo-free value, instead of two independently free-typed text fields. */
  readonly indianStates: string[] = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  selectedCountry = signal<TaxCountry | null>(null);

  /** Read-only display of the selected country's configured rate(s) — sourced entirely
   * from tax-countries.json, never hardcoded here. Flat-rate regimes (e.g. VAT) show a
   * single rate; state-based regimes (e.g. GST) show both the same-state and
   * different-state components since either can apply depending on the customer. */
  get taxRateSummary(): string {
    const country = this.selectedCountry();
    if (!country) return '';

    const format = (components: { name: string; rate: number }[] | null) =>
      (components ?? []).map(c => `${c.name} ${c.rate}%`).join(' + ');

    if (country.flatComponents?.length) {
      return format(country.flatComponents);
    }

    const sameState = format(country.sameStateComponents);
    const diffState = format(country.differentStateComponents);
    if (!sameState && !diffState) return '';
    return `Same state: ${sameState || '—'}  |  Different state: ${diffState || '—'}`;
  }

  numberingLoading     = signal(true);
  numberingError       = signal<string | null>(null);
  numberingSaving      = signal(false);
  numberingSaveSuccess = signal(false);

  numberingForm = {
    quoteSeriesPrefix: 'Q-', quoteStartingNumber: 1001,
    invoiceSeriesPrefix: 'INV-', invoiceStartingNumber: 1001
  };
  /** Live read-only counter values, as currently stored — distinct from the editable "starting number" above. */
  numberingCurrent = { quoteNextNumber: 1001, invoiceNextNumber: 1001 };

  googleStatus         = signal<GoogleWorkspaceStatus>({ connected: false });
  loadingGoogleStatus  = signal(true);
  connectingGoogle     = signal(false);

  /** Drives the "Connected Services" checklist in the Integrations card. */
  googleServiceList = () => {
    const services = this.googleStatus().services ?? {};
    return [
      { key: 'gmail', label: 'Gmail', granted: !!services.gmail },
      { key: 'calendar', label: 'Calendar', granted: !!services.calendar },
      { key: 'meet', label: 'Google Meet (via Calendar)', granted: !!services.meet },
      { key: 'tasks', label: 'Google Tasks', granted: !!services.tasks }
    ];
  };

  prefs = {
    currency:    localStorage.getItem('crm_currency')    ?? 'INR',
    dateFormat:  localStorage.getItem('crm_date_format') ?? 'DD/MM/YYYY',
    timezone:    localStorage.getItem('crm_timezone')    ?? 'Asia/Kolkata',
    pageSize:    localStorage.getItem('crm_page_size')   ?? '25',
    notifLeads:   localStorage.getItem('crm_notif_leads')   !== 'false',
    notifDeals:   localStorage.getItem('crm_notif_deals')   !== 'false',
    notifTasks:   localStorage.getItem('crm_notif_tasks')   !== 'false',
    notifLicense: localStorage.getItem('crm_notif_license') !== 'false',
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
        next: res => {
          this.license.set(res);
          this.licenseLoading.set(false);
        },
        error: err => {
          this.licenseError.set(err?.error?.message || 'Could not load license information.');
          this.licenseLoading.set(false);
        }
      });

    this.http.get<any>(`${this.cfg.crmApiUrl}/api/v1/organizations/me/billing-profile`, { headers: this.hdrs() })
      .subscribe({
        next: res => {
          this.billingForm = {
            legalName: res?.legalName ?? '',
            email: res?.email ?? '',
            phone: res?.phone ?? '',
            address: res?.address ?? '',
            gstin: res?.gstin ?? '',
            companyTagline: res?.companyTagline ?? '',
            bankName: res?.bankName ?? '',
            bankAccountNumber: res?.bankAccountNumber ?? '',
            bankIfsc: res?.bankIfsc ?? '',
            upiId: res?.upiId ?? '',
            paymentTermsDays: res?.paymentTermsDays ?? 30,
            lateFeeText: res?.lateFeeText ?? ''
          };
          this.billingLoading.set(false);
        },
        error: err => {
          this.billingError.set(err?.error?.message || 'Could not load billing details.');
          this.billingLoading.set(false);
        }
      });

    this.http.get<TaxCountry[]>('/tax-countries.json').subscribe({
      next: countries => {
        this.taxCountries.set(countries || []);
        this.loadTaxSettings();
      },
      error: () => {
        this.taxError.set('Could not load the supported countries list.');
        this.taxLoading.set(false);
      }
    });

    this.loadNumbering();
    this.loadGoogleStatus();
    this.handleGoogleRedirect();
  }

  /** Single OAuth connection covers Gmail, Calendar/Meet, and Tasks — one redirect handles all of them. */
  private handleGoogleRedirect(): void {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google');
    if (!status) return;
    if (status === 'connected') {
      this.loadGoogleStatus();
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

  loadGoogleStatus(): void {
    this.loadingGoogleStatus.set(true);
    this.http.get<GoogleWorkspaceStatus>(`${this.cfg.crmApiUrl}/api/v1/google/auth/status`, { headers: this.hdrs() })
      .subscribe({
        next: status => {
          this.googleStatus.set(status);
          this.loadingGoogleStatus.set(false);
        },
        error: () => {
          this.googleStatus.set({ connected: false });
          this.loadingGoogleStatus.set(false);
        }
      });
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
          this.googleStatus.set({ connected: false });
          this.toast.addSuccess('Disconnected', 'Google Workspace has been disconnected.');
        },
        error: () => this.toast.addError('Disconnect failed', 'Could not disconnect Google. Please try again.')
      });
  }

  private loadNumbering(): void {
    this.http.get<any>(`${this.cfg.crmApiUrl}/api/v1/user-settings`, { headers: this.hdrs() })
      .subscribe({
        next: res => {
          const quoteNext = res?.quoteNextNumber ?? 1001;
          const invoiceNext = res?.invoiceNextNumber ?? 1001;
          this.numberingForm = {
            quoteSeriesPrefix: res?.quoteSeriesPrefix ?? 'Q-',
            quoteStartingNumber: quoteNext,
            invoiceSeriesPrefix: res?.invoiceSeriesPrefix ?? 'INV-',
            invoiceStartingNumber: invoiceNext
          };
          this.numberingCurrent = { quoteNextNumber: quoteNext, invoiceNextNumber: invoiceNext };
          this.numberingLoading.set(false);
        },
        error: err => {
          this.numberingError.set(err?.error?.message || 'Could not load document numbering settings.');
          this.numberingLoading.set(false);
        }
      });
  }

  saveNumbering(): void {
    this.numberingSaving.set(true);
    this.numberingError.set(null);
    const payload = {
      quoteSeriesPrefix: this.numberingForm.quoteSeriesPrefix,
      quoteNextNumber: this.numberingForm.quoteStartingNumber,
      invoiceSeriesPrefix: this.numberingForm.invoiceSeriesPrefix,
      invoiceNextNumber: this.numberingForm.invoiceStartingNumber
    };
    this.http.put<any>(`${this.cfg.crmApiUrl}/api/v1/user-settings`, payload, { headers: this.hdrs() })
      .subscribe({
        next: res => {
          this.numberingCurrent = {
            quoteNextNumber: res?.quoteNextNumber ?? this.numberingForm.quoteStartingNumber,
            invoiceNextNumber: res?.invoiceNextNumber ?? this.numberingForm.invoiceStartingNumber
          };
          this.numberingSaving.set(false);
          this.numberingSaveSuccess.set(true);
          setTimeout(() => this.numberingSaveSuccess.set(false), 3000);
        },
        error: err => {
          this.numberingSaving.set(false);
          this.numberingError.set(err?.error?.message || 'Failed to save document numbering settings.');
        }
      });
  }

  private loadTaxSettings(): void {
    this.http.get<any>(`${this.cfg.crmApiUrl}/api/v1/tax-settings/me`, { headers: this.hdrs() })
      .subscribe({
        next: res => {
          if (res?.countryCode) {
            this.taxForm = {
              countryCode: res.countryCode,
              countryName: res.countryName ?? '',
              taxSystem: res.taxSystem ?? '',
              registrationLabel: res.registrationLabel ?? '',
              registrationNumber: res.registrationNumber ?? '',
              businessState: res.businessState ?? '',
              requiresBusinessState: !!res.requiresBusinessState,
              configJson: res.configJson ?? ''
            };
            this.selectedCountry.set(this.taxCountries().find(c => c.countryCode === res.countryCode) ?? null);
          }
          this.taxLoading.set(false);
        },
        error: err => {
          this.taxError.set(err?.error?.message || 'Could not load tax settings.');
          this.taxLoading.set(false);
        }
      });
  }

  onCountryChange(countryCode: string): void {
    const country = this.taxCountries().find(c => c.countryCode === countryCode) ?? null;
    this.selectedCountry.set(country);
    if (!country) return;
    this.taxForm.countryCode = country.countryCode;
    this.taxForm.countryName = country.countryName;
    this.taxForm.taxSystem = country.taxSystem;
    this.taxForm.registrationLabel = country.registrationLabel;
    this.taxForm.requiresBusinessState = country.requiresBusinessState;
    this.taxForm.configJson = JSON.stringify(country);
  }

  saveTaxSettings(): void {
    this.taxSaving.set(true);
    this.taxError.set(null);
    this.http.put<any>(`${this.cfg.crmApiUrl}/api/v1/tax-settings/me`, this.taxForm, { headers: this.hdrs() })
      .subscribe({
        next: () => {
          this.taxSaving.set(false);
          this.taxSaveSuccess.set(true);
          setTimeout(() => this.taxSaveSuccess.set(false), 3000);
        },
        error: err => {
          this.taxSaving.set(false);
          this.taxError.set(err?.error?.message || 'Failed to save tax settings.');
        }
      });
  }

  formatDate(d: any): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return String(d); }
  }

  savePrefs(): void {
    this.saving.set(true);
    localStorage.setItem('crm_currency',    this.prefs.currency);
    localStorage.setItem('crm_date_format', this.prefs.dateFormat);
    localStorage.setItem('crm_timezone',    this.prefs.timezone);
    localStorage.setItem('crm_page_size',   this.prefs.pageSize);
    localStorage.setItem('crm_notif_leads',   String(this.prefs.notifLeads));
    localStorage.setItem('crm_notif_deals',   String(this.prefs.notifDeals));
    localStorage.setItem('crm_notif_tasks',   String(this.prefs.notifTasks));
    localStorage.setItem('crm_notif_license', String(this.prefs.notifLicense));

    setTimeout(() => {
      this.saving.set(false);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 2000);
    }, 400);
  }

  saveBillingProfile(): void {
    this.billingSaving.set(true);
    this.billingError.set(null);
    this.http.put<any>(`${this.cfg.crmApiUrl}/api/v1/organizations/me/billing-profile`, this.billingForm, { headers: this.hdrs() })
      .subscribe({
        next: () => {
          this.billingSaving.set(false);
          this.billingSaveSuccess.set(true);
          setTimeout(() => this.billingSaveSuccess.set(false), 2000);
        },
        error: err => {
          this.billingSaving.set(false);
          this.billingError.set(err?.error?.message || 'Failed to save billing details.');
        }
      });
  }
}
