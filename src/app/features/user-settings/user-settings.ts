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
  template: `
    <div class="settings-page">
      <div class="settings-header">
        <h1>Personal Settings</h1>
        <p>Your personal preferences, license, printing, integrations, and mail history</p>
      </div>

      <div class="settings-layout">
        <aside class="settings-sidebar">
          <button class="settings-nav-btn" [class.settings-nav-btn--active]="activeSection() === 'license'" (click)="setSection('license')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            License Information
          </button>
          <button class="settings-nav-btn" [class.settings-nav-btn--active]="activeSection() === 'general'" (click)="setSection('general')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            General Settings
          </button>
          <button class="settings-nav-btn" [class.settings-nav-btn--active]="activeSection() === 'notifications'" (click)="setSection('notifications')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Notifications
          </button>
          <button class="settings-nav-btn" [class.settings-nav-btn--active]="activeSection() === 'integrations'" (click)="setSection('integrations')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Integrations
          </button>
          <button class="settings-nav-btn" [class.settings-nav-btn--active]="activeSection() === 'printing'" (click)="setSection('printing')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line>
            </svg>
            Document &amp; Printing
          </button>
          <button class="settings-nav-btn" [class.settings-nav-btn--active]="activeSection() === 'logs'" (click)="setSection('logs')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Outbound Mail Logs
          </button>
        </aside>

        <main class="settings-content">

          <!-- ── License Information (read-only, auto-loaded) ── -->
          @if (activeSection() === 'license') {
          <div class="settings-card">
            <h2 class="settings-section-title">License Information</h2>
            <p class="settings-section-desc">Your organization's active CRM license details</p>

            @if (licenseLoading()) {
              <span class="loading-chip">Loading…</span>
            } @else {
              <span class="status-chip" [class.chip-active]="license()?.status === 'ACTIVE' || license()?.status === 'GRACE'"
                                        [class.chip-expired]="license()?.status === 'EXPIRED'">
                {{ license()?.status ?? 'Unknown' }}
              </span>
            }

            @if (licenseError()) {
              <div class="info-banner info-warn">{{ licenseError() }}</div>
            }

            @if (license()) {
              <div class="info-grid">
                <div class="info-field">
                  <span class="info-label">Organization</span>
                  <span class="info-value">{{ license()?.organizationName ?? '—' }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">License Name</span>
                  <span class="info-value">{{ license()?.licenseName ?? '—' }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">Expires</span>
                  <span class="info-value">{{ formatDate(license()?.endDate) }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">Days Remaining</span>
                  <span class="info-value" [class.warn-text]="(license()?.daysRemaining ?? 0) < 30">
                    {{ license()?.daysRemaining ?? '—' }}
                  </span>
                </div>
                @if (license()?.inGracePeriod) {
                  <div class="info-field">
                    <span class="info-label">Grace Days Left</span>
                    <span class="info-value warn-text">{{ license()?.graceRemaining }}</span>
                  </div>
                }
              </div>

              @if (license()?.features?.length) {
                <div class="features-section">
                  <span class="info-label">Allowed Modules</span>
                  <div class="feature-tags">
                    @for (f of license()!.features; track f) {
                      <span class="feature-tag">{{ f }}</span>
                    }
                  </div>
                </div>
              }
            }
          </div>
          }

          <!-- ── General Settings ── -->
          @if (activeSection() === 'general') {
          <div class="settings-card">
            <h2 class="settings-section-title">General Settings</h2>
            <p class="settings-section-desc">Your personal display preferences</p>

            <div class="settings-row">
              <div class="setting-item">
                <div class="setting-label">
                  <span>Date Format</span>
                  <span class="setting-desc">How dates are displayed for you throughout CRM</span>
                </div>
                <select class="setting-select" [(ngModel)]="prefs.dateFormat">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div class="setting-item">
                <div class="setting-label">
                  <span>Timezone</span>
                  <span class="setting-desc">Used for reminders and due dates</span>
                </div>
                <select class="setting-select" [(ngModel)]="prefs.timezone">
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>

              <div class="setting-item">
                <div class="setting-label">
                  <span>Records Per Page</span>
                  <span class="setting-desc">Default number of rows in list views</span>
                </div>
                <select class="setting-select" [(ngModel)]="prefs.pageSize">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <div class="section-actions">
              <button class="btn-save" (click)="savePrefs()" [disabled]="prefsSaving()">
                {{ prefsSaving() ? 'Saving…' : 'Save Settings' }}
              </button>
              @if (prefsSaveSuccess()) {
                <span class="save-success">✓ Saved</span>
              }
            </div>
          </div>
          }

          <!-- ── Notifications ── -->
          @if (activeSection() === 'notifications') {
          <div class="settings-card">
            <h2 class="settings-section-title">Notification Preferences</h2>
            <p class="settings-section-desc">Choose which activities or deal changes should notify you</p>

            @if (settingsLoading()) {
              <span class="loading-chip">Loading…</span>
            } @else {
            <div class="toggle-list">
              <div class="toggle-item">
                <div class="toggle-label">
                  <span>New Lead Assigned</span>
                  <span class="setting-desc">Notify me immediately when a new lead is assigned to my ownership</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.notifyLeadAssigned">
                  <span class="toggle-track"></span>
                </label>
              </div>
              <div class="toggle-item">
                <div class="toggle-label">
                  <span>Deal Stage Changed</span>
                  <span class="setting-desc">Notify me when deals I own transition into Closed Won or Closed Lost</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.notifyDealStageChange">
                  <span class="toggle-track"></span>
                </label>
              </div>
              <div class="toggle-item">
                <div class="toggle-label">
                  <span>Task Due Reminder</span>
                  <span class="setting-desc">Notify me when tasks assigned to me are reaching their due date</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.notifyTaskDue">
                  <span class="toggle-track"></span>
                </label>
              </div>
              <div class="toggle-item">
                <div class="toggle-label">
                  <span>Quote Acceptance Alerts</span>
                  <span class="setting-desc">Notify me when a client accepts or rejects one of my sent quotes</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.notifyQuoteApproved">
                  <span class="toggle-track"></span>
                </label>
              </div>
              <div class="toggle-item">
                <div class="toggle-label">
                  <span>Invoice Paid Alerts</span>
                  <span class="setting-desc">Notify me when an invoice generated from my quote has been marked Paid</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.notifyInvoicePaid">
                  <span class="toggle-track"></span>
                </label>
              </div>
              <div class="toggle-item">
                <div class="toggle-label">
                  <span>Daily Follow-up Reminders</span>
                  <span class="setting-desc">Notify me about critical customer touchpoints</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.notifyFollowupReminder">
                  <span class="toggle-track"></span>
                </label>
              </div>
            </div>

            <div class="section-actions">
              <button class="btn-save" (click)="saveSettings()" [disabled]="settingsSaving()">
                {{ settingsSaving() ? 'Saving…' : 'Save Settings' }}
              </button>
              @if (settingsSaveSuccess()) {
                <span class="save-success">✓ Saved</span>
              }
            </div>
            }
          </div>
          }

          <!-- ── Integrations: Google Workspace (per-user connection) ── -->
          @if (activeSection() === 'integrations') {
          <div class="settings-card">
            <h2 class="settings-section-title">Google Workspace</h2>
            <p class="settings-section-desc">
              Connect your own Google account once to automatically integrate Gmail, Calendar, Google Meet, and Google Tasks —
              no separate connection needed for each service. Each teammate connects their own account separately.
            </p>

            @if (!googleStatusService.loading()) {
              @if (googleStatus()?.connected) {
                <div class="google-cal-card">
                  <div class="google-cal-info">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/><path d="m8 12 3 3 5-6"/>
                    </svg>
                    <div>
                      <strong class="status-dot status-dot--connected">🟢 Connected</strong>
                      <div class="google-cal-sub">{{ googleStatus()?.email }}</div>
                      @if (googleStatus()?.lastApiSuccessAt) {
                        <div class="google-cal-sub">Last successful API call {{ formatDate(googleStatus()?.lastApiSuccessAt) }}</div>
                      }
                    </div>
                  </div>
                  <div class="google-cal-actions">
                    <button class="btn-secondary" (click)="disconnectGoogle()">Disconnect</button>
                  </div>
                </div>

                <div class="google-services-grid">
                  @for (svc of googleServiceList(); track svc.key) {
                    <div class="google-service-chip" [class.google-service-chip--missing]="!svc.granted">
                      @if (svc.granted) {
                        <span class="svc-check">✓</span> {{ svc.label }}
                      } @else {
                        <span class="svc-cross">✗</span> {{ svc.label }} — <span class="svc-permission-required">Permission Required</span>
                      }
                    </div>
                  }
                </div>

                @if (googleStatus()?.needsReconnect) {
                  <div class="google-cal-card">
                    <div class="google-cal-info">
                      <div class="google-cal-sub google-cal-warning">Google access was revoked or expired — reconnect to resume all Google Workspace features.</div>
                    </div>
                    <div class="google-cal-actions">
                      <button class="btn-save" [disabled]="connectingGoogle()" (click)="connectGoogle()">
                        {{ connectingGoogle() ? 'Redirecting…' : 'Reconnect' }}
                      </button>
                    </div>
                  </div>
                }
              } @else {
                <div class="google-cal-card">
                  <div class="google-cal-info">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/>
                    </svg>
                    <div>
                      <strong>Not connected</strong>
                      <div class="google-cal-sub">Connect once to enable Gmail, Calendar, Google Meet, and Google Tasks for your account.</div>
                    </div>
                  </div>
                  <div class="google-cal-actions">
                    <button class="btn-save" [disabled]="connectingGoogle()" (click)="connectGoogle()">
                      {{ connectingGoogle() ? 'Redirecting…' : 'Connect Google' }}
                    </button>
                  </div>
                </div>
              }
            } @else {
              <div class="google-cal-card"><span>Checking connection status…</span></div>
            }
          </div>
          }

          <!-- ── Document & Printing ── -->
          @if (activeSection() === 'printing') {
          <div class="settings-card">
            <h2 class="settings-section-title">Document Numbering</h2>
            <p class="settings-section-desc">Set by your System Admin under Tax &amp; Billing Settings — applies to every quote and invoice across the whole tenant. Read-only here.</p>

            @if (settingsLoading()) {
              <span class="loading-chip">Loading…</span>
            } @else {
            <div class="info-grid">
              <div class="info-field">
                <span class="info-label">Quotation Series Prefix</span>
                <span class="info-value">{{ settings.quoteSeriesPrefix ?? '—' }}</span>
              </div>
              <div class="info-field">
                <span class="info-label">Next Quotation Number</span>
                <span class="info-value">{{ settings.quoteNextNumber ?? '—' }}</span>
              </div>
              <div class="info-field">
                <span class="info-label">Invoice Series Prefix</span>
                <span class="info-value">{{ settings.invoiceSeriesPrefix ?? '—' }}</span>
              </div>
              <div class="info-field">
                <span class="info-label">Next Invoice Number</span>
                <span class="info-value">{{ settings.invoiceNextNumber ?? '—' }}</span>
              </div>
            </div>
            }

            <h2 class="settings-section-title" style="margin-top: 28px; border-top: 1px dashed #e5e7eb; padding-top: 24px;">Printer Setup</h2>
            <p class="settings-section-desc">Detect and configure physical or virtual printer connections for direct record printing.</p>

            <div class="settings-row">
              <div class="setting-item">
                <div class="setting-label">
                  <span>Default Print Device</span>
                  <span class="setting-desc">
                    @if (!scanningPrinters() && detectedPrinters().length > 0) {
                      {{ detectedPrinters().length }} printer(s) detected online
                    } @else if (!scanningPrinters()) {
                      No active print devices found
                    } @else {
                      Searching local print services… {{ scanProgress() }}%
                    }
                  </span>
                </div>
                <div style="display: flex; gap: 8px;">
                  <select class="setting-select" [(ngModel)]="settings.defaultPrinter" [disabled]="scanningPrinters()">
                    <option value="">-- No Default Printer --</option>
                    @for (pr of detectedPrinters(); track pr) {
                      <option [value]="pr">{{ pr }}</option>
                    }
                  </select>
                  <button type="button" class="btn-secondary" (click)="startPrinterScan()" [disabled]="scanningPrinters()">
                    {{ scanningPrinters() ? 'Scanning…' : 'Scan' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="section-actions">
              <button class="btn-save" (click)="saveSettings()" [disabled]="settingsSaving()">
                {{ settingsSaving() ? 'Saving…' : 'Save Settings' }}
              </button>
              @if (settingsSaveSuccess()) {
                <span class="save-success">✓ Saved</span>
              }
            </div>
          </div>
          }

          <!-- ── Outbound Mail Logs ── -->
          @if (activeSection() === 'logs') {
          <div class="settings-card">
            <div class="settings-logs-header">
              <div>
                <h2 class="settings-section-title">Outbound Mail Logs</h2>
                <p class="settings-section-desc">Audit trail of system emails, invoices, and quotes sent from your account.</p>
              </div>
              <button class="btn-secondary" (click)="loadLogs()" [disabled]="loadingLogs()">Refresh</button>
            </div>

            @if (loadingLogs()) {
              <span class="loading-chip">Fetching email logs…</span>
            } @else if (emailLogs().length === 0) {
              <div class="settings-logs-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>No emails sent from your account yet.</span>
              </div>
            } @else {
              <div class="settings-table-wrap">
                <table class="settings-table">
                  <thead>
                    <tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Sent At</th></tr>
                  </thead>
                  <tbody>
                    @for (log of emailLogs(); track log.id) {
                      <tr>
                        <td>{{ log.toEmail }}</td>
                        <td class="settings-log-subject" [title]="log.subject">{{ log.subject }}</td>
                        <td><span class="settings-log-status-badge settings-log-status-badge--{{ log.status.toLowerCase() }}">{{ log.status }}</span></td>
                        <td>{{ log.sentAt | date:'dd MMM yyyy HH:mm' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
          }

        </main>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 24px;
      background: var(--crm-bg, #f8fafc);
      min-height: calc(100vh - 60px);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .settings-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #111827; }
    .settings-header p { margin: 4px 0 0; font-size: 0.88rem; color: #6b7280; }

    .settings-layout { display: flex; gap: 24px; flex: 1; }
    @media (max-width: 768px) { .settings-layout { flex-direction: column; } }

    .settings-sidebar { width: 260px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    @media (max-width: 768px) {
      .settings-sidebar { width: 100%; flex-direction: row; overflow-x: auto; padding-bottom: 8px; }
    }

    .settings-nav-btn {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
      color: #4b5563; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s ease; text-align: left;
    }
    .settings-nav-btn svg { stroke: currentColor; flex-shrink: 0; }
    .settings-nav-btn:hover { background: #f3f4f6; color: #111827; }
    .settings-nav-btn--active { background: #0F3460; border-color: #0F3460; color: #fff; }
    .settings-nav-btn--active:hover { background: #163E7A; color: #fff; }
    @media (max-width: 768px) { .settings-nav-btn { white-space: nowrap; } }

    .settings-content { flex: 1; min-width: 0; }

    .settings-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .settings-section-title { margin: 0; font-size: 1.15rem; font-weight: 700; color: #111827; }
    .settings-section-desc { margin: 4px 0 20px; font-size: 0.82rem; color: #6b7280; line-height: 1.5; }

    .status-chip { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 99px; }
    .chip-active  { background: #dcfce7; color: #166534; }
    .chip-expired { background: #fee2e2; color: #991b1b; }
    .loading-chip { font-size: 12px; color: #6b7280; }

    .info-banner { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
    .info-warn   { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .info-field { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #9ca3af; letter-spacing: .04em; }
    .info-value { font-size: 14px; font-weight: 500; color: #111827; }
    .warn-text  { color: #d97706; }

    .features-section { margin-top: 20px; border-top: 1px solid #f3f4f6; padding-top: 16px; }
    .feature-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .feature-tag { background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe; }

    .settings-row { display: flex; flex-direction: column; gap: 4px; }
    .setting-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
    .setting-item:last-child { border-bottom: none; }
    .setting-label { display: flex; flex-direction: column; gap: 2px; }
    .setting-label span:first-child { font-size: 14px; font-weight: 500; color: #111827; }
    .setting-desc { font-size: 12px; color: #9ca3af; }

    .setting-select {
      border: 1px solid #d1d5db; border-radius: 8px;
      padding: 7px 12px; font-size: 13px; color: #374151;
      background: #f9fafb; cursor: pointer; outline: none;
      min-width: 180px;
    }
    .setting-select:focus { border-color: #0F3460; background: #fff; }

    .section-actions { margin-top: 20px; display: flex; align-items: center; gap: 12px; }
    .btn-save {
      background: #0F3460; color: #fff; border: none;
      padding: 9px 22px; border-radius: 8px;
      font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .save-success { font-size: 13px; color: #16a34a; font-weight: 500; }

    .toggle-list { display: flex; flex-direction: column; gap: 0; }
    .toggle-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
    .toggle-item:last-child { border-bottom: none; }
    .toggle-label { display: flex; flex-direction: column; gap: 2px; }
    .toggle-label span:first-child { font-size: 14px; font-weight: 500; color: #111827; }

    .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-track { position: absolute; inset: 0; background: #d1d5db; border-radius: 99px; cursor: pointer; transition: background 0.2s; }
    .toggle-track::after { content: ''; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; left: 3px; top: 3px; transition: transform 0.2s; }
    .toggle-switch input:checked + .toggle-track { background: #0F3460; }
    .toggle-switch input:checked + .toggle-track::after { transform: translateX(18px); }

    .google-cal-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 18px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb; flex-wrap: wrap; }
    .google-cal-info { display: flex; align-items: center; gap: 12px; color: #374151; font-size: 0.85rem; }
    .google-cal-info svg { color: #0F3460; flex-shrink: 0; }
    .google-cal-sub { font-size: 0.75rem; color: #9ca3af; margin-top: 2px; }
    .google-cal-warning { color: #b45309; }
    .status-dot--connected { color: #10b981; }
    .google-services-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
    .google-service-chip { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 500; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .google-service-chip--missing { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
    .svc-check { color: #10b981; font-weight: 700; }
    .svc-cross { color: #ef4444; font-weight: 700; }
    .svc-permission-required { font-weight: 600; }
    .google-cal-actions { display: flex; gap: 8px; }
    .btn-secondary { padding: 9px 18px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #4b5563; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-secondary:hover { background: #f3f4f6; }
    .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

    .settings-logs-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
    .settings-logs-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: #9ca3af; font-size: 0.85rem; }
    .settings-table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
    .settings-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .settings-table th, .settings-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .settings-table th { background: #f9fafb; color: #9ca3af; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .settings-table td { color: #111827; }
    .settings-table tr:last-child td { border-bottom: none; }
    .settings-log-subject { max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .settings-log-status-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 0.68rem; font-weight: 600; text-transform: capitalize; }
    .settings-log-status-badge--sent { background: rgba(16, 185, 129, 0.12); color: #059669; }
    .settings-log-status-badge--failed { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .settings-log-status-badge--pending { background: rgba(245, 158, 11, 0.1); color: #d97706; }
  `]
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
