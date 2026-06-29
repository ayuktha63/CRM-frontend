import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface Widget {
  id: string;
  type: 'kpi' | 'bar_chart' | 'pie_chart' | 'table' | 'target_meter';
  title: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  value?: string | number;
  color?: string;
  progress?: number;
}

interface Dashboard { id?: number; name: string; shareType: string; layoutConfig: string; }

@Component({
  selector: 'app-dashboard-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-builder.html',
  styleUrls: ['./dashboard-builder.scss']
})
export class DashboardBuilderComponent implements OnInit {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/v1';

  dashboards = signal<Dashboard[]>([]);
  selectedDashboard = signal<Dashboard | null>(null);
  widgets = signal<Widget[]>([]);
  showCreateDash = signal(false);
  showAddWidget = signal(false);
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  newDash: Dashboard = { name: '', shareType: 'PRIVATE', layoutConfig: '[]' };
  
  newWidget: Partial<Widget> = {
    type: 'kpi', title: '', col: 1, row: 1, colSpan: 1, rowSpan: 1, color: '#6366F1', value: '0', progress: 50
  };

  widgetTypes = [
    { value: 'kpi', label: 'KPI Card', icon: '📊' },
    { value: 'bar_chart', label: 'Bar Chart', icon: '📈' },
    { value: 'pie_chart', label: 'Pie Chart', icon: '🥧' },
    { value: 'table', label: 'Data Table', icon: '📋' },
    { value: 'target_meter', label: 'Target Meter', icon: '🎯' },
  ];

  colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#0F3460'];

  // Mock KPI data loaded from backend stats
  kpiData: Record<string, any> = {};

  ngOnInit() {
    this.loadDashboards();
    this.loadKpiData();
    // Set a default pre-configured dashboard view
    this.loadDefaultWidgets();
  }

  loadDashboards() {
    this.http.get<Dashboard[]>(`${this.base}/crm-dashboards`)
      .pipe(catchError(() => of([])))
      .subscribe(d => this.dashboards.set(d));
  }

  loadKpiData() {
    this.http.get<any>(`${this.base}/dashboard/summary`)
      .pipe(catchError(() => of({})))
      .subscribe(d => this.kpiData = d || {});
  }

  loadDefaultWidgets() {
    const defaults: Widget[] = [
      { id: 'w1', type: 'kpi', title: 'Total Leads', col: 1, row: 1, colSpan: 1, rowSpan: 1, value: '—', color: '#6366F1' },
      { id: 'w2', type: 'kpi', title: 'Total Contacts', col: 2, row: 1, colSpan: 1, rowSpan: 1, value: '—', color: '#10B981' },
      { id: 'w3', type: 'kpi', title: 'Pipeline Value', col: 3, row: 1, colSpan: 1, rowSpan: 1, value: '—', color: '#F59E0B' },
      { id: 'w4', type: 'kpi', title: 'Tasks Due Today', col: 4, row: 1, colSpan: 1, rowSpan: 1, value: '—', color: '#EF4444' },
      { id: 'w5', type: 'bar_chart', title: 'Pipeline by Stage', col: 1, row: 2, colSpan: 2, rowSpan: 2, color: '#6366F1' },
      { id: 'w6', type: 'target_meter', title: 'Revenue Target', col: 3, row: 2, colSpan: 1, rowSpan: 1, value: '₹48L', color: '#10B981', progress: 65 },
      { id: 'w7', type: 'target_meter', title: 'Lead Conversion', col: 4, row: 2, colSpan: 1, rowSpan: 1, value: '65%', color: '#8B5CF6', progress: 65 },
      { id: 'w8', type: 'pie_chart', title: 'Deals by Source', col: 3, row: 3, colSpan: 2, rowSpan: 1, color: '#EC4899' },
    ];

    this.http.get<any>(`${this.base}/dashboard/summary`)
      .pipe(catchError(() => of({})))
      .subscribe((data: any) => {
        if (data) {
          defaults[0].value = data.totalLeads ?? 0;
          defaults[1].value = data.totalContacts ?? 0;
          defaults[2].value = data.pipelineValue ? `₹${(data.pipelineValue / 100000).toFixed(1)}L` : '₹0';
          defaults[3].value = data.tasksDueToday ?? 0;
        }
        this.widgets.set(defaults);
      });
  }

  selectDashboard(dash: Dashboard) {
    this.selectedDashboard.set(dash);
    try {
      const parsed: Widget[] = JSON.parse(dash.layoutConfig || '[]');
      this.widgets.set(parsed.length > 0 ? parsed : this.widgets());
    } catch { }
  }

  createDashboard() {
    if (!this.newDash.name) return;
    this.newDash.layoutConfig = JSON.stringify(this.widgets());
    this.http.post<Dashboard>(`${this.base}/crm-dashboards`, this.newDash)
      .subscribe({
        next: d => {
          this.dashboards.update(list => [...list, d]);
          this.selectedDashboard.set(d);
          this.showCreateDash.set(false);
          this.newDash = { name: '', shareType: 'PRIVATE', layoutConfig: '[]' };
          this.showToast('Dashboard saved!', 'success');
        },
        error: () => this.showToast('Save failed', 'error')
      });
  }

  addWidget() {
    if (!this.newWidget.title) return;
    const widget: Widget = {
      id: 'w' + Date.now(),
      type: this.newWidget.type as any || 'kpi',
      title: this.newWidget.title!,
      col: this.newWidget.col || 1,
      row: this.newWidget.row || 1,
      colSpan: this.newWidget.colSpan || 1,
      rowSpan: this.newWidget.rowSpan || 1,
      color: this.newWidget.color,
      value: this.newWidget.value,
      progress: this.newWidget.progress
    };
    this.widgets.update(list => [...list, widget]);
    this.showAddWidget.set(false);
    this.newWidget = { type: 'kpi', title: '', col: 1, row: 1, colSpan: 1, rowSpan: 1, color: '#6366F1', value: '0', progress: 50 };
    this.showToast('Widget added!', 'success');
  }

  removeWidget(id: string) {
    this.widgets.update(list => list.filter(w => w.id !== id));
  }

  saveDashboard() {
    const dash = this.selectedDashboard();
    if (!dash) { this.showCreateDash.set(true); return; }
    dash.layoutConfig = JSON.stringify(this.widgets());
    this.http.post<Dashboard>(`${this.base}/crm-dashboards`, dash)
      .subscribe({
        next: () => this.showToast('Dashboard saved!', 'success'),
        error: () => this.showToast('Save failed', 'error')
      });
  }

  getGridStyle(w: Widget): Record<string, string> {
    return {
      'grid-column': `${w.col} / span ${w.colSpan}`,
      'grid-row': `${w.row} / span ${w.rowSpan}`,
      '--w-color': w.color || '#6366F1'
    };
  }

  getBarData(): { label: string; pct: number; color: string }[] {
    return [
      { label: 'Prospecting', pct: 85, color: '#6366F1' },
      { label: 'Qualification', pct: 60, color: '#3B82F6' },
      { label: 'Proposal', pct: 45, color: '#8B5CF6' },
      { label: 'Negotiation', pct: 30, color: '#F59E0B' },
      { label: 'Closed Won', pct: 20, color: '#10B981' },
    ];
  }

  getPieData(): { label: string; pct: number; color: string }[] {
    return [
      { label: 'Website', pct: 35, color: '#6366F1' },
      { label: 'Referral', pct: 25, color: '#10B981' },
      { label: 'Cold Call', pct: 20, color: '#F59E0B' },
      { label: 'LinkedIn', pct: 20, color: '#EC4899' },
    ];
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
