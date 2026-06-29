import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface CrmReport {
  id?: number;
  name: string;
  moduleName: string;
  columns: string;
  groupBy: string;
  aggregations: string;
  filters: string;
  chartConfig: string;
  shareType: string;
}

@Component({
  selector: 'app-report-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-builder.html',
  styleUrls: ['./report-builder.scss']
})
export class ReportBuilderComponent implements OnInit {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/v1';

  reports = signal<CrmReport[]>([]);
  reportData = signal<any[]>([]);
  loading = signal(false);
  running = signal(false);
  selectedReport = signal<CrmReport | null>(null);
  showCreateForm = signal(false);
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form
  newReport: CrmReport = {
    name: '', moduleName: 'leads', columns: '', groupBy: '',
    aggregations: '', filters: '', chartConfig: '', shareType: 'PRIVATE'
  };

  modules = [
    { value: 'leads', label: 'Leads' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'accounts', label: 'Accounts' },
    { value: 'deals', label: 'Deals' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'campaigns', label: 'Campaigns' },
    { value: 'activities', label: 'Activities' },
  ];

  chartType = 'bar';
  chartTypes = ['bar', 'line', 'pie', 'donut', 'area'];

  ngOnInit() { this.loadReports(); }

  loadReports() {
    this.loading.set(true);
    this.http.get<CrmReport[]>(`${this.base}/crm-reports`)
      .pipe(catchError(() => of([])))
      .subscribe(data => { this.reports.set(data); this.loading.set(false); });
  }

  createReport() {
    if (!this.newReport.name) return;
    this.http.post<CrmReport>(`${this.base}/crm-reports`, this.newReport)
      .subscribe({
        next: r => {
          this.reports.update(list => [...list, r]);
          this.showCreateForm.set(false);
          this.showToast('Report created!', 'success');
          this.newReport = { name: '', moduleName: 'leads', columns: '', groupBy: '', aggregations: '', filters: '', chartConfig: '', shareType: 'PRIVATE' };
        },
        error: () => this.showToast('Failed to create report', 'error')
      });
  }

  runReport(report: CrmReport) {
    this.selectedReport.set(report);
    this.running.set(true);
    this.http.get<any[]>(`${this.base}/crm-reports/${report.id}/run`)
      .pipe(catchError(() => of([])))
      .subscribe(data => { this.reportData.set(data); this.running.set(false); });
  }

  deleteReport(id: number | undefined) {
    if (!id) return;
    this.http.delete(`${this.base}/crm-reports/${id}`).subscribe({
      next: () => {
        this.reports.update(list => list.filter(r => r.id !== id));
        if (this.selectedReport()?.id === id) this.selectedReport.set(null);
        this.showToast('Report deleted', 'success');
      }
    });
  }

  getReportColumns(report: CrmReport): string[] {
    if (!report.columns) return ['id'];
    return report.columns.split(',').map(c => c.trim());
  }

  getDataColumns(): string[] {
    const data = this.reportData();
    if (!data.length) return [];
    return Object.keys(data[0]);
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
