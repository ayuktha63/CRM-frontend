import { Component, inject, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  RecordDetailComponent,
  FormDrawerComponent,
  OToastService,
  ORQUE_API_URL,
  PageConfig,
  PageStoreService
} from 'orque-ui';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-record-detail-wrapper',
  standalone: true,
  imports: [CommonModule, RecordDetailComponent, FormDrawerComponent],
  template: `
    <div class="wrapper">
      <app-record-detail></app-record-detail>
      <o-form-drawer
        [open]="drawerOpen"
        [title]="drawerTitle"
        [steps]="steps"
        [rowData]="rowData"
        [showSubmit]="false"
        [readOnly]="false"
        [actionType]="'edit'"
        (closeDrawer)="drawerOpen = false"
        (save)="onSave($event)">
      </o-form-drawer>
    </div>
  `,
  styles: [`
    .wrapper { position: relative; }
  `]
})
export class RecordDetailWrapperComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(RecordDetailComponent) detailComponent!: RecordDetailComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(OToastService);
  private readonly store = inject(PageStoreService);
  private readonly apiBase = inject(ORQUE_API_URL);
  private readonly sub = new Subscription();

  record: any = null;
  drawerOpen = false;
  drawerTitle = '';
  rowData: any = null;
  steps: any[] = [];

  ngOnInit() {
    this.sub.add(this.route.params.subscribe(p => {
      const r = this.route.snapshot.data['resource'];
      this.load(r, p['id']);
    }));
  }

  ngAfterViewInit() {
    // Intercept the child RecordDetailComponent's executeAction so that
    // clicking the "Edit" header action opens our form drawer instead of
    // POSTing to a non-existent /edit endpoint.
    const child = this.detailComponent;
    if (!child) return;
    const originalExecute = (child as any).executeAction?.bind(child);
    if (originalExecute) {
      (child as any).executeAction = (action: string) => {
        if (action === 'edit') {
          this.openEdit();
        } else {
          originalExecute(action);
        }
      };
    }
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  private token() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` });
  }

  private load(resource: string, id: string) {
    this.record = null;
    this.sub.add(this.http.get(`${this.apiBase}/api/v1/${resource}/${id}`, { headers: this.token() }).subscribe({
      next: (r: any) => { this.record = r; }
    }));
    this.sub.add(this.store.getPageConfig(resource).subscribe({
      next: (c: PageConfig) => { this.steps = c?.steps || []; }
    }));
  }

  openEdit() {
    if (!this.record) return;
    const label = this.record['companyName'] || this.record['fullName'] || this.record['name'] || 'Record';
    this.drawerTitle = `Edit ${label}`;
    this.rowData = { ...this.record };
    this.drawerOpen = true;
  }

  onSave(payload: any) {
    this.drawerOpen = false;
    const id = this.record?.['id'];
    const resource = this.route.snapshot.data['resource'];
    this.sub.add(this.http.put(`${this.apiBase}/api/v1/${resource}/${id}`, payload, { headers: this.token() }).subscribe({
      next: (u: any) => {
        this.record = u;
        this.toast.addSuccess('Saved', 'Record updated.');
        // Force the child RecordDetailComponent to reload so its displayed
        // values reflect the changes immediately instead of on page reload.
        const resource = this.route.snapshot.data['resource'];
        (this.detailComponent as any)?.loadPage(resource, u['id']);
      },
      error: (e: any) => { this.toast.addError('Save failed', e?.error?.message ?? e.message); }
    }));
  }
}
