import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  RecordDetailComponent,
  FormDrawerComponent,
  PageStoreService,
  PageConfig,
  OToastService
} from 'orque-ui';
import { EditInterceptService } from '../../core/services/edit-intercept.service';

@Component({
  selector: 'app-record-detail-wrapper',
  standalone: true,
  imports: [
    CommonModule,
    RecordDetailComponent,
    FormDrawerComponent
  ],
  templateUrl: './record-detail-wrapper.html',
  styleUrl: './record-detail-wrapper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecordDetailWrapperComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(PageStoreService);
  private readonly editIntercept = inject(EditInterceptService);
  private readonly toast = inject(OToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();

  /** Form drawer state */
  drawerOpen = signal(false);
  drawerTitle = signal('');
  drawerRowData = signal<any>(null);
  drawerSteps = signal<any[]>([]);

  /** The resource module (leads, contacts, deals, accounts) — set from route data */
  private resource = '';
  /** The base API path (e.g. /api/v1/leads) — loaded from page config */
  private api = '';
  /** The record id currently being viewed in the detail component */
  private recordId = '';

  ngOnInit(): void {
    this.resource = this.route.snapshot.data['resource'] ?? '';
    if (!this.resource) return;

    // Load the page config to get the steps (form definition) and API path
    this.store.getPageConfig(this.resource).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (config: PageConfig) => {
        this.api = config.api;
        this.drawerSteps.set(config.steps ?? []);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.addError('Error', 'Failed to load form configuration.');
      }
    });

    // Subscribe to edit interception events
    this.editIntercept.onEditRequested().pipe(
      takeUntil(this.destroy$)
    ).subscribe((id: string) => {
      this.recordId = id;
      this.openEditDrawer(id);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private openEditDrawer(id: string): void {
    if (!this.api) {
      this.toast.addError('Error', 'Form configuration not loaded yet.');
      return;
    }

    // Fetch the record data to populate the form
    this.store.get(`${this.api}/${id}`).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (record: any) => {
        this.drawerRowData.set({ ...record });
        const label = record.fullName || record.name || record.dealName ||
                     record.title || record.companyName || id;
        this.drawerTitle.set(`Edit ${label}`);
        this.drawerOpen.set(true);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.addError('Error', 'Failed to load record for editing.');
      }
    });
  }

  onDrawerClose(): void {
    this.drawerOpen.set(false);
    this.cdr.markForCheck();
  }

  onDrawerSave(payload: any): void {
    this.drawerOpen.set(false);
    this.cdr.markForCheck();

    // PUT to {api}/{id} — mirrors the working pattern in list-page.ts:414
    this.store.put(`${this.api}/${this.recordId}`, payload).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toast.addSuccess('Saved', 'Record updated successfully.');
        // Navigate away and back so RecordDetailComponent re-initializes and
        // fetches the fresh record from the API.
        const currentUrl = this.router.url;
        this.router.navigateByUrl('/dashboard', { skipLocationChange: true }).then(() => {
          this.router.navigateByUrl(currentUrl);
        });
      },
      error: (err: any) => {
        this.toast.addError('Save Failed', err?.error?.message || err.message || 'Failed to save record.');
      }
    });
  }
}
