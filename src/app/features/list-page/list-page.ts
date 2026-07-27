import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PageRendererComponent,
  PageAction,
  PageConfig,
  OToastService,
  CalendarWorkspaceComponent,
  CustomizationComponent,
  EmailWorkspaceComponent,
  InventoryComponent,
  ReportBuilderComponent,
  ReportsComponent,
  TasksWorkspaceComponent,
  PageStoreService,
  FormDrawerComponent,
  ConfirmationDialogComponent,
  ConfirmationDialogType
} from 'orque-ui';
import { KanbanComponent } from './kanban/kanban';
import { SysadminSettingsComponent } from '../system-admin/sysadmin-settings/sysadmin-settings';
import { PersonalSettingsComponent } from '../user-settings/user-settings';
import { CrmDashboardBuilderComponent } from '../crm-dashboard-builder/crm-dashboard-builder';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppConfigService } from '../../core/services/app-config.service';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageRendererComponent,
    FormDrawerComponent,
    KanbanComponent,
    CalendarWorkspaceComponent,
    CustomizationComponent,
    CrmDashboardBuilderComponent,
    EmailWorkspaceComponent,
    InventoryComponent,
    ReportBuilderComponent,
    ReportsComponent,
    TasksWorkspaceComponent,
    PersonalSettingsComponent,
    SysadminSettingsComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './list-page.html',
  styleUrl: './list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListPageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() resource = '';

  showLicenseSettings(): boolean {
    const raw = localStorage.getItem('crmUser');
    if (!raw) return false;
    try {
      const user = JSON.parse(raw);
      const role = (user?.role || user?.roleName || '').toUpperCase();
      return role === 'SYSTEM_ADMIN' || role === 'ADMIN';
    } catch {
      return false;
    }
  }

  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  selectedRow: any = null;
  previewRecord: any = null;

  resetPasswordTarget = signal<{ uuid: string; label: string } | null>(null);
  resetPasswordValue = signal('');
  resetPasswordSubmitting = signal(false);
  resetPasswordError = signal('');

  dealInvoicesOpen = signal(false);
  dealInvoicesLoading = signal(false);
  dealInvoicesList = signal<any[]>([]);
  dealInvoicesDealLabel = signal('');

  closeDealInvoicesPopup(): void {
    this.dealInvoicesOpen.set(false);
  }

  get resetPasswordValueModel(): string { return this.resetPasswordValue(); }
  set resetPasswordValueModel(v: string) { this.resetPasswordValue.set(v); }

  cancelResetPassword(): void {
    this.resetPasswordTarget.set(null);
    this.resetPasswordValue.set('');
    this.resetPasswordError.set('');
  }

  submitResetPassword(): void {
    const target = this.resetPasswordTarget();
    if (!target) return;
    const newPwd = this.resetPasswordValue().trim();
    if (!newPwd) {
      this.resetPasswordError.set('Please enter a new password.');
      return;
    }

    this.resetPasswordSubmitting.set(true);
    this.resetPasswordError.set('');
    const base = this.page!.api;
    const sub = this.store.post(`${base}/${target.uuid}/reset-password`, { newPassword: newPwd }).subscribe({
      next: () => {
        this.resetPasswordSubmitting.set(false);
        this.toast.addSuccess('Password Reset', `Password updated for ${target.label}.`);
        this.cancelResetPassword();
      },
      error: (err) => {
        this.resetPasswordSubmitting.set(false);
        this.resetPasswordError.set(err?.error?.message || err.message || 'Reset failed.');
      }
    });
    this._subs.add(sub);
  }

  readonly quotePreviewFields = [
    { label: 'Quote Number', key: 'quoteNumber',  type: 'text' },
    { label: 'Contact',      key: 'contact',      type: 'text' },
    { label: 'Account',      key: 'account',      type: 'text' },
    { label: 'Amount',       key: 'amount',       type: 'currency' },
    { label: 'Valid Until',  key: 'validUntil',   type: 'date' },
    { label: 'Status',       key: 'status',       type: 'status' },
    { label: 'Created By',   key: 'createdBy',    type: 'text' },
  ];

  readonly invoicePreviewFields = [
    { label: 'Invoice Number', key: 'invoiceNumber', type: 'text' },
    { label: 'Contact',        key: 'contact',       type: 'text' },
    { label: 'Account',        key: 'account',       type: 'text' },
    { label: 'Amount',         key: 'amount',        type: 'currency' },
    { label: 'Due Date',       key: 'dueDate',       type: 'date' },
    { label: 'Paid Date',      key: 'paidDate',      type: 'date' },
    { label: 'Status',         key: 'status',        type: 'status' },
    { label: 'Created By',     key: 'createdBy',     type: 'text' },
  ];

  previewStatusClass(status: string): string {
    if (!status) return '';
    const s = status.toLowerCase();
    const base = 'font-size:0.72rem;font-weight:700;letter-spacing:0.03em;padding:2px 9px;border-radius:20px;text-transform:capitalize;';
    if (['active','accepted','paid'].includes(s))  return `${base}background:rgba(16,185,129,0.1);color:#059669`;
    if (['draft','inactive'].includes(s))          return `${base}background:rgba(148,163,184,0.1);color:#64748b`;
    if (['pending','sent','overdue'].includes(s))  return `${base}background:rgba(245,158,11,0.1);color:#d97706`;
    if (['rejected','cancelled'].includes(s))      return `${base}background:rgba(239,68,68,0.1);color:#dc2626`;
    return base;
  }

  pdfDownloading = false;
  private readonly http = inject(HttpClient);
  private readonly cfg = inject(AppConfigService);
  readonly auth = inject(AuthService);
  private get base(): string { return this.cfg.crmApiUrl; }

  // Kanban board edit drawer (mirrors o-page-renderer's own form-drawer wiring,
  // since the Kanban view is a plain component, not o-page-renderer)
  editDrawerOpen = false;
  editDrawerTitle = '';
  editDrawerRowData: any = null;

  onEditDrawerSave(payload: any): void {
    this.editDrawerOpen = false;
    this.handleAction({ action: 'save', row: this.editDrawerRowData, payload } as PageAction);
  }

  // Bulk operations states
  selectedBulkRows: any[] = [];
  bulkActionDrawerOpen = false;
  bulkActionType: 'edit' | 'assign' | 'status' | '' = '';
  bulkActionTitle = '';
  bulkEditField = '';
  bulkEditValue = '';
  bulkAssignOwner = '';
  bulkStatusValue = '';
  salesUsers: any[] = [];

  columnFilters: Record<string, string> = {};
  tempFilters: Record<string, string> = {};
  activeFilterField: string | null = null;

  page: PageConfig | null = null;
  data: any[] = [];
  loading = false;
  error: string | null = null;
  viewMode: 'table' | 'kanban' = 'table';

  // Custom resource states
  activeStatusTab = signal('ALL');
  loadingCustom = false;

  private _loadedResource: string | null = null;
  private _subs = new Subscription();

  private readonly store = inject(PageStoreService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(OToastService);

  // In-app confirmation dialog (replaces window.confirm)
  confirmState = signal<{
    title: string;
    message: string;
    confirmLabel?: string;
    type?: ConfirmationDialogType;
    onConfirm: () => void;
  } | null>(null);

  private askConfirm(message: string, onConfirm: () => void, opts?: { title?: string; confirmLabel?: string; type?: ConfirmationDialogType }): void {
    this.confirmState.set({
      title: opts?.title || 'Please Confirm',
      message,
      confirmLabel: opts?.confirmLabel,
      type: opts?.type || 'warning',
      onConfirm
    });
  }

  onConfirmDialogConfirm(): void {
    const state = this.confirmState();
    this.confirmState.set(null);
    state?.onConfirm();
  }

  onConfirmDialogCancel(): void {
    this.confirmState.set(null);
  }

  constructor() {}

  private resetState(): void {
    this.activeStatusTab.set('ALL');
    this.selectedRow = null;
    this.columnFilters = {};
    this.tempFilters = {};
    this.selectedBulkRows = [];
  }

  ngOnInit(): void {
    const routeResource = this.route.snapshot.data['resource'];
    if (routeResource) {
      this.resource = routeResource;
    }
    if (this.resource && this._loadedResource !== this.resource) {
      this._loadedResource = this.resource;
      this.viewMode = 'table';
      this.resetState();
      this.loadPage();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resource'] && this.resource && this._loadedResource !== this.resource) {
      this._loadedResource = this.resource;
      this.viewMode = 'table';
      this.resetState();
      this.loadPage();
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  canShowKanban(): boolean {
    return ['deals', 'leads', 'tasks'].includes(this.resource);
  }

  isCustomResource(): boolean {
    return [
      'calendar', 'reports', 'report-builder', 'customization',
      'emails', 'google-tasks', 'inventory', 'dashboard-builder', 'user-settings'
    ].includes(this.resource);
  }

  getCurrentUser(): any {
    try {
      const raw = localStorage.getItem('crmUser');
      return raw ? JSON.parse(raw) : { name: 'Admin User', role: 'ADMIN', email: 'admin@orque.io' };
    } catch {
      return { name: 'Admin User', role: 'ADMIN', email: 'admin@orque.io' };
    }
  }

  private loadPage(): void {
    this.selectedRow = null;
    this.selectedBulkRows = [];
    this.loading = true;
    this.error = null;
    this.page = null;
    this.data = [];
    this.cdr.markForCheck();

    const sub = this.store.getPageConfig(this.resource).subscribe({
      next: (config: PageConfig) => {
        this.page = config;
        // Initialise the status tab to the JSON-defined default (the element with isDefault:true, or first element)
        if (config.toggleButton?.elements?.length) {
          const def = config.toggleButton.elements.find((e: any) => e.isDefault) ?? config.toggleButton.elements[0];
          this.activeStatusTab.set(def.value ?? 'All');
        }
        this.cdr.markForCheck();
        if (this.isCustomResource()) {
          this.loadCustomResource();
        } else {
          this.loadData(config.api);
        }
      },
      error: (err) => {
        this.error = `Failed to load page config: ${err.message}`;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
    this._subs.add(sub);
  }

  private loadData(api: string): void {
    this.loading = true;
    this.selectedBulkRows = [];
    this.cdr.markForCheck();

    const sub = this.store.getList(api).subscribe({
      next: (rows) => {
        this.data = rows ?? [];
        // selectedRow/previewRecord hold a reference into the *previous* data array;
        // resync them to the freshly fetched row so any status/field change made via
        // an action (e.g. "Send" on a quote) is reflected wherever that record is
        // still being displayed (preview panel, floating action bar), instead of
        // showing the pre-action snapshot until the row is reselected.
        if (this.selectedRow) {
          this.selectedRow = this.data.find(r => r.id === this.selectedRow.id) ?? null;
        }
        if (this.previewRecord) {
          this.previewRecord = this.data.find(r => r.id === this.previewRecord.id) ?? null;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load data: ${err.message}`;
        this.data = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
    this._subs.add(sub);
  }

  private loadCustomResource(): void {
    this.loading = false;
    this.loadingCustom = false;
    this.cdr.markForCheck();
  }

  handleAction(event: PageAction): void {
    if (!this.page) return;
    const uuid = event.row?.[this.page.tableUniqueFieldName || 'id'];
    const base = this.page.workflowApiBase || this.page.api;
    const label = event.row?.fullName || event.row?.name || event.row?.dealName ||
                  event.row?.title || event.row?.companyName || event.row?.quoteNumber ||
                  event.row?.invoiceNumber || uuid || 'Record';

    switch (event.action) {
      case 'view':
      case 'rowClick': {
        if ((this.resource === 'quotes' || this.resource === 'invoices') && event.row) {
          this.previewRecord = event.row;
        }
        break;
      }

      case 'navigate': {
        if (uuid) this.router.navigate(['/', this.resource, uuid]);
        break;
      }

      case 'edit': {
        this.editDrawerTitle = `Edit ${label}`;
        this.editDrawerRowData = { ...event.row };
        this.editDrawerOpen = true;
        break;
      }

      case 'save': {
        if (this.page && !this.validateEmailFields(event.payload)) {
          break;
        }
        const payloadId = event.payload?.id ?? event.row?.id
          ?? event.row?.[this.page?.tableUniqueFieldName || 'id'];
        const obs = payloadId
          ? this.store.put(`${base}/${payloadId}`, event.payload)
          : this.store.post(base, event.payload);
        const sub = obs.subscribe({
          next: () => {
            this.toast.addSuccess('Saved', `${label} saved successfully.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Save failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'qualify': {
        const sub = this.store.post(`${base}/qualify/${uuid}`, {}).subscribe({
          next: () => {
            this.toast.addSuccess('Qualified', `${label} moved to Qualified.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Action failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'disqualify': {
        const sub = this.store.post(`${base}/disqualify/${uuid}`, {}).subscribe({
          next: () => {
            this.toast.addSuccess('Disqualified', `${label} moved to Disqualified.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Action failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'submit': {
        const targetApi = uuid ? `${base}/submit/${uuid}` : base;
        const sub = this.store.post(targetApi, event.payload ?? {}).subscribe({
          next: () => {
            this.toast.addSuccess('Submitted', `${label} submitted successfully.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Submit failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'approve': {
        const sub = this.store.post(`${base}/approve/${uuid}`, {}).subscribe({
          next: () => {
            this.toast.addSuccess('Approved', `${label} approved.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Approve failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'reject': {
        const sub = this.store.post(`${base}/reject/${uuid}`, {}).subscribe({
          next: () => {
            this.toast.addWarning('Rejected', `${label} rejected.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Reject failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'gen-invoice': {
        const quoteId = uuid;
        const sub = this.store.post(`/api/v1/quotes/${quoteId}/invoice`, {}).subscribe({
          next: () => {
            this.toast.addSuccess('Invoice Created', `Invoice generated from ${label}.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Invoice failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'terminate': {
        const sub = this.store.delete(`${base}/${uuid}`).subscribe({
          next: () => {
            this.toast.addSuccess('Session Terminated', `Session for ${label} has been terminated.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Terminate failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'terminate-all': {
        this.askConfirm('Terminate all other active sessions?', () => {
          const sub = this.store.delete(`${base}/terminate-all`).subscribe({
            next: () => {
              this.toast.addSuccess('Done', 'All other sessions terminated.');
              this.loadData(this.page!.api);
            },
            error: (err) => this.showError(`Terminate all failed: ${err?.error?.message || err.message}`)
          });
          this._subs.add(sub);
        }, { title: 'Terminate Sessions', confirmLabel: 'Terminate' });
        break;
      }

      case 'view-invoices': {
        this.dealInvoicesDealLabel.set(label);
        this.dealInvoicesOpen.set(true);
        this.dealInvoicesLoading.set(true);
        this.dealInvoicesList.set([]);
        const sub = this.store.getList(`${base}/${uuid}/invoices`).subscribe({
          next: (data) => {
            this.dealInvoicesList.set(data || []);
            this.dealInvoicesLoading.set(false);
          },
          error: (err) => {
            this.dealInvoicesLoading.set(false);
            this.showError(`Failed to load invoices: ${err?.error?.message || err.message}`);
          }
        });
        this._subs.add(sub);
        break;
      }

      case 'reset-password': {
        this.resetPasswordTarget.set({ uuid, label });
        this.resetPasswordValue.set('');
        this.resetPasswordError.set('');
        break;
      }

      case 'activate':
      case 'deactivate':
      case 'launch': {
        const sub = this.store.post(`${base}/${uuid}/${event.action}`, {}).subscribe({
          next: () => {
            this.toast.addSuccess('Done', `${label}: ${event.action} completed.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Action failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'delete': {
        this.askConfirm(`Delete "${label}"? This cannot be undone.`, () => {
          const sub = this.store.delete(`${base}/${uuid}`).subscribe({
            next: () => {
              this.toast.addSuccess('Deleted', `${label} deleted.`);
              this.loadData(this.page!.api);
            },
            error: (err) => this.showError(`Delete failed: ${err?.error?.message || err.message}`)
          });
          this._subs.add(sub);
        }, { title: 'Delete Record', confirmLabel: 'Delete', type: 'danger' });
        break;
      }

      case 'refresh':
        this.loadData(this.page.api);
        break;

      case 'export':
        this.exportExcel(event.payload);
        break;
    }
  }

  private exportExcel(rows?: any[]): void {
    const toExport = rows?.length ? rows : this.data;
    if (!toExport.length) { this.showError('No records to export.'); return; }
    const headers = Object.keys(toExport[0]);

    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const cell = (val: any) => {
      const s = val == null ? '' : String(val);
      const isNum = typeof val === 'number' && !isNaN(val);
      return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${esc(s)}</Data></Cell>`;
    };

    const headerRow = `<Row>${headers.map(h => cell(h)).join('')}</Row>`;
    const dataRows = toExport.map(r => `<Row>${headers.map(h => cell(r[h])).join('')}</Row>`).join('');

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#4338CA" ss:Pattern="Solid"/>
      <Font ss:Color="#FFFFFF" ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${esc(this.resource)}">
    <Table>${headerRow}${dataRows}</Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.resource}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleSelectRow(row: any): void {
    if (this.selectedRow?.id === row.id) {
      this.selectedRow = null;
    } else {
      this.selectedRow = row;
    }
    this.cdr.markForCheck();
  }

  get sidebarOffset(): string {
    const collapsed = localStorage.getItem('crm_sidebar_collapsed') === 'true';
    return collapsed ? '64px' : '240px';
  }

  private hdrs(): HttpHeaders {
    const token = localStorage.getItem('accessToken') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  downloadPdfForSelected(type: 'quotes' | 'invoices'): void {
    if (!this.selectedRow || this.pdfDownloading) return;
    const rowId = this.selectedRow.id;
    const filename = String(this.selectedRow[type === 'invoices' ? 'invoiceNumber' : 'quoteNumber'] ?? `${type}-${rowId}`);

    this.pdfDownloading = true;
    this.cdr.markForCheck();

    this._subs.add(
      this.http.get(`${this.base}/api/v1/${type}/${rowId}/pdf`, {
        headers: this.hdrs(),
        responseType: 'blob'
      }).subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href     = url;
          a.download = `${filename}.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          this.pdfDownloading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.pdfDownloading = false;
          this.toast.addError('Error', 'Failed to generate PDF. Please try again.');
          this.cdr.markForCheck();
        }
      })
    );
  }

  generateInvoiceFromQuote(): void {
    const active = this.pdfActiveRow;
    if (!active || this.pdfDownloading) return;

    if (active.status !== 'Accepted') {
      this.toast.addError('Error', 'Invoice can only be generated from an Accepted quote.');
      return;
    }

    // Ensure selectedRow is set so post-generation cleanup works correctly
    this.selectedRow = active;

    const quoteId = this.selectedRow.id;
    this.pdfDownloading = true;
    this.cdr.markForCheck();

    this._subs.add(
      this.http.post<any>(`${this.base}/api/v1/quotes/${quoteId}/invoice`, {}, {
        headers: this.hdrs()
      }).subscribe({
        next: (invoice) => {
          this.toast.addSuccess('Success', `Invoice ${invoice.invoiceNumber} generated successfully!`);
          this.pdfDownloading = false;

          this.selectedRow = null;
          this.loadPage();

          const filename = invoice.invoiceNumber || `invoice-${invoice.id}`;
          this.http.get(`${this.base}/api/v1/invoices/${invoice.id}/pdf`, {
            headers: this.hdrs(),
            responseType: 'blob'
          }).subscribe({
            next: blob => {
              const url = URL.createObjectURL(blob);
              const a   = document.createElement('a');
              a.href     = url;
              a.download = `${filename}.pdf`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 5000);
            },
            error: () => {
              this.toast.addError('Error', 'Invoice created, but failed to download PDF.');
            }
          });
        },
        error: (err) => {
          this.pdfDownloading = false;
          const msg = err?.error?.message || 'Failed to generate invoice from quote.';
          this.toast.addError('Error', msg);
          this.cdr.markForCheck();
        }
      })
    );
  }

  private showError(msg: string): void {
    this.toast.addError('Error', msg);
  }

  private validateEmailFields(payload: any): boolean {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    for (const step of this.page?.steps || []) {
      for (const field of step.fields || []) {
        if (field.inputType === 'email' && payload[field.name] != null && payload[field.name] !== '') {
          if (!emailPattern.test(payload[field.name])) {
            this.toast.addError('Invalid field', `${field.label} must be a valid email address.`);
            return false;
          }
        }
      }
    }
    return true;
  }

  toggleFilterPopup(field: string): void {
    if (this.activeFilterField === field) {
      this.activeFilterField = null;
    } else {
      this.activeFilterField = field;
      this.tempFilters[field] = this.columnFilters[field] || '';
    }
  }

  closeFilterPopup(): void {
    this.activeFilterField = null;
  }

  onFilterInput(event: Event, field: string): void {
    const val = (event.target as HTMLInputElement).value;
    this.tempFilters[field] = val;
  }

  hasFilter(field: string): boolean {
    return !!this.columnFilters[field];
  }

  applyFilter(field: string): void {
    this.columnFilters[field] = this.tempFilters[field] || '';
    this.selectedRow = null;
    this.activeFilterField = null;
    this.cdr.markForCheck();
  }

  clearFilter(field: string): void {
    this.tempFilters[field] = '';
    this.columnFilters[field] = '';
    this.selectedRow = null;
    this.activeFilterField = null;
    this.cdr.markForCheck();
  }

  onCustomTableToolAction(action: string): void {
    if (action === 'add') {
      this.handleAction({ action: 'create', row: null });
    } else if (action === 'edit') {
      const single = this.selectedBulkRows.length === 1 ? this.selectedBulkRows[0] : this.selectedRow;
      if (single) {
        this.handleAction({ action: 'edit', row: single });
      } else {
        this.toast.addError('Selection Required', 'Please select exactly one row to edit.');
      }
    } else if (action === 'refresh') {
      this.loadPage();
    } else if (action === 'clear') {
      this.selectedRow = null;
      this.selectedBulkRows = [];
      this.cdr.markForCheck();
    } else if (action === 'export') {
      this.exportExcel();
    } else if (action === 'print') {
      if (this.selectedBulkRows.length > 0) {
        this.printQuoteInvoiceRows(
          this.page?.title || this.resource,
          this.page?.tableList || [],
          this.selectedBulkRows
        );
      }
    }
  }

  get filteredTableData(): any[] {
    let rows = [...(this.data || [])];
    
    if (this.resource === 'quotes' || this.resource === 'invoices') {
      const activeTab = this.activeStatusTab();
      // 'All' / 'ALL' / '' all mean show everything
      if (activeTab && activeTab.toLowerCase() !== 'all') {
        rows = rows.filter(r =>
          (r.status ?? '').toLowerCase() === activeTab.toLowerCase()
        );
      }
    }
    
    for (const field of Object.keys(this.columnFilters)) {
      const query = this.columnFilters[field]?.trim().toLowerCase();
      if (query) {
        rows = rows.filter(r => {
          const val = String(r[field] ?? '').toLowerCase();
          return val.includes(query);
        });
      }
    }
    
    return rows;
  }

  onSelectionChanged(rows: any[]) {
    this.selectedBulkRows = rows;
    // For quotes/invoices the PDF bar derives from selectedBulkRows;
    // clear the single-click selectedRow if user switches to checkbox selection.
    if ((this.resource === 'quotes' || this.resource === 'invoices') && rows.length > 0) {
      this.selectedRow = null;
    }
    this.cdr.detectChanges();
  }

  /** The row that drives the single-record labels/status checks in the PDF bar. */
  get pdfActiveRow(): any {
    return this.selectedBulkRows.length > 0 ? this.selectedBulkRows[0] : this.selectedRow;
  }

  clearPdfSelection() {
    this.selectedRow = null;
    this.selectedBulkRows = [];
    this.cdr.detectChanges();
  }

  clearBulkSelection() {
    this.selectedBulkRows = [];
    this.cdr.detectChanges();
  }

  /**
   * Download PDFs for all currently checked rows (quotes or invoices).
   * Falls back to selectedRow for backwards compatibility with row-click selection.
   */
  downloadSelectedPdfs(type: 'quotes' | 'invoices'): void {
    const rows = this.selectedBulkRows.length > 0 ? this.selectedBulkRows : (this.selectedRow ? [this.selectedRow] : []);
    if (rows.length === 0 || this.pdfDownloading) return;
    this.pdfDownloading = true;
    const downloadNext = (index: number) => {
      if (index >= rows.length) {
        this.pdfDownloading = false;
        this.clearPdfSelection();
        this.cdr.detectChanges();
        return;
      }
      const row = rows[index];
      const rowId = row.id;
      const filename = String(row[type === 'invoices' ? 'invoiceNumber' : 'quoteNumber'] ?? `${type}-${rowId}`);
      this.http.get(`${this.base}/api/v1/${type}/${rowId}/pdf`, {
        headers: this.hdrs(), responseType: 'blob'
      }).subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filename}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          downloadNext(index + 1);
        },
        error: (err: any) => {
          this.toast.addError('PDF Error', `Failed to generate PDF for ${filename}`);
          this.pdfDownloading = false;
          this.cdr.detectChanges();
        }
      });
    };

    downloadNext(0);
  }

  getBulkEditFields() {
    if (this.resource === 'leads' || this.resource === 'contacts') {
      return [
        { label: 'Industry', value: 'industry' },
        { label: 'City', value: 'city' },
        { label: 'Country', value: 'country' },
        { label: 'Address', value: 'address' },
        { label: 'Job Title', value: 'jobtitle' },
        { label: 'Website', value: 'website' }
      ];
    }
    if (this.resource === 'accounts') {
      return [
        { label: 'Industry', value: 'industry' },
        { label: 'Phone', value: 'phone' },
        { label: 'Country', value: 'country' },
        { label: 'Website', value: 'website' }
      ];
    }
    if (this.resource === 'deals') {
      return [
        { label: 'Stage', value: 'stage' },
        { label: 'Amount', value: 'amount' }
      ];
    }
    return [];
  }

  getBulkStatuses() {
    if (this.resource === 'leads') {
      // Must match com.orque.crm.enums.LeadStatus exactly — bulk-status posts this value
      // straight to LeadStatus.valueOf(), so anything else 400s.
      return [
        { label: 'New',          value: 'NEW' },
        { label: 'Qualified',    value: 'QUALIFIED' },
        { label: 'Converted',    value: 'CONVERTED' },
        { label: 'Disqualified', value: 'DISQUALIFIED' }
      ];
    }
    if (this.resource === 'deals') {
      return [
        { label: 'Prospecting', value: 'Prospecting' },
        { label: 'Qualification', value: 'Qualification' },
        { label: 'Proposal', value: 'Proposal' },
        { label: 'Negotiation', value: 'Negotiation' },
        { label: 'Closed Won', value: 'Closed Won' },
        { label: 'Closed Lost', value: 'Closed Lost' }
      ];
    }
    if (this.resource === 'accounts') {
      return [
        { label: 'Active',   value: 'Active' },
        { label: 'Prospect', value: 'Prospect' },
        { label: 'Inactive', value: 'Inactive' }
      ];
    }
    return [];
  }

  openBulkEditDrawer() {
    this.bulkActionType = 'edit';
    this.bulkActionTitle = 'Bulk Edit Fields';
    this.bulkEditField = '';
    this.bulkEditValue = '';
    this.bulkActionDrawerOpen = true;
    this.cdr.detectChanges();
  }

  openBulkAssignDrawer() {
    this.bulkActionType = 'assign';
    this.bulkActionTitle = 'Bulk Assign Owner';
    this.bulkAssignOwner = '';
    this.bulkActionDrawerOpen = true;
    this.loadSalesUsersForBulk();
  }

  openBulkStatusDrawer() {
    this.bulkActionType = 'status';
    this.bulkActionTitle = 'Bulk Update Status';
    this.bulkStatusValue = '';
    this.bulkActionDrawerOpen = true;
    this.cdr.detectChanges();
  }

  loadSalesUsersForBulk() {
    this.http.get<any[]>(`${this.base}/api/v1/users/sales`, { headers: this.hdrs() })
      .subscribe({
        next: data => {
          this.salesUsers = data.map(u => ({ username: u.username, fullName: u.fullName }));
          this.cdr.detectChanges();
        },
        error: () => {
          this.salesUsers = [
            { username: 'admin', fullName: 'System Admin' },
            { username: 'sales_rep', fullName: 'Sales Representative' }
          ];
          this.cdr.detectChanges();
        }
      });
  }

  bulkDeleteSelected() {
    this.askConfirm(
      `Are you sure you want to delete these ${this.selectedBulkRows.length} records?`,
      () => {
        const ids = this.selectedBulkRows.map(r => r.id);
        this.http.post<any>(`${this.base}/api/v1/bulk/delete?module=${this.resource}`, ids, { headers: this.hdrs() })
          .subscribe({
            next: () => {
              this.toast.addSuccess('Deleted', 'Bulk delete completed.');
              this.selectedBulkRows = [];
              if (this.page) {
                this.loadData(this.page.api);
              }
              this.cdr.detectChanges();
            },
            error: err => this.toast.addError('Bulk Delete Failed', err?.error?.message || 'Bulk delete failed.')
          });
      },
      { title: 'Delete Records', confirmLabel: 'Delete', type: 'danger' }
    );
  }

  submitBulkAction() {
    const ids = this.selectedBulkRows.map(r => r.id);

    let url = `${this.base}/api/v1/bulk/`;
    if (this.bulkActionType === 'edit') {
      if (!this.bulkEditField) { this.toast.addWarning('Missing Field', 'Choose field.'); return; }
      url += `edit?module=${this.resource}&fieldName=${this.bulkEditField}&fieldValue=${encodeURIComponent(this.bulkEditValue)}`;
    } else if (this.bulkActionType === 'assign') {
      if (!this.bulkAssignOwner) { this.toast.addWarning('Missing Owner', 'Choose owner.'); return; }
      url += `assign?module=${this.resource}&owner=${this.bulkAssignOwner}`;
    } else if (this.bulkActionType === 'status') {
      if (!this.bulkStatusValue) { this.toast.addWarning('Missing Status', 'Choose status.'); return; }
      url += `status?module=${this.resource}&status=${this.bulkStatusValue}`;
    } else {
      return;
    }

    this.http.post<any>(url, ids, { headers: this.hdrs() }).subscribe({
      next: () => {
        this.toast.addSuccess('Done', 'Bulk operation completed successfully.');
        this.bulkActionDrawerOpen = false;
        this.selectedBulkRows = [];
        if (this.page) {
          this.loadData(this.page.api);
        }
        this.cdr.detectChanges();
      },
      error: err => this.toast.addError('Bulk Action Failed', err?.error?.message || 'Bulk action failed.')
    });
  }

  // ── Quotes / Invoices row-selection helpers ──────────────────────────────

  isQuoteInvoiceRowSelected(row: any): boolean {
    return this.selectedBulkRows.some(r => r.id === row.id);
  }

  toggleSelectQuoteInvoiceRow(row: any): void {
    const idx = this.selectedBulkRows.findIndex(r => r.id === row.id);
    if (idx >= 0) {
      this.selectedBulkRows = this.selectedBulkRows.filter((_, i) => i !== idx);
    } else {
      this.selectedBulkRows = [...this.selectedBulkRows, row];
    }
    this.cdr.markForCheck();
  }

  toggleSelectAllQuotesInvoices(): void {
    const all = this.filteredTableData;
    if (this.selectedBulkRows.length === all.length && all.length > 0) {
      this.selectedBulkRows = [];
    } else {
      this.selectedBulkRows = [...all];
    }
    this.cdr.markForCheck();
  }

  printQuoteInvoiceRows(pageTitle: string, columns: any[], rows: any[]): void {
    const pw = window.open('', '_blank');
    if (!pw) { this.toast.addError('Blocked', 'Pop-up blocker is preventing the print view.'); return; }

    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const thead = '<tr>' + columns.map(c => `<th>${esc(c.label)}</th>`).join('') + '</tr>';
    const tbody = rows.map(row =>
      '<tr>' + columns.map(col => {
        let val = row[col.name] ?? '—';
        if (col.pipe === 'date' && val !== '—') val = new Date(val).toLocaleDateString();
        return `<td>${esc(val)}</td>`;
      }).join('') + '</tr>'
    ).join('');

    pw.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print — ${esc(pageTitle)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #1e293b; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; }
    p.meta { font-size: 0.78rem; color: #64748b; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1e293b; color: #fff; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #374151; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${esc(pageTitle)}</h1>
  <p class="meta">${rows.length} record${rows.length !== 1 ? 's' : ''} selected &nbsp;·&nbsp; Printed on ${new Date().toLocaleString()}</p>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
      setTimeout(function() { window.close(); }, 1000);
    };
  </script>
</body>
</html>`);
    pw.document.close();
  }
}
