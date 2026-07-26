import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
  RecordDetailComponent,
  FormDrawerComponent,
  ORQUE_API_URL
} from 'orque-ui';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-crm-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FormDrawerComponent],
  template: `
<!-- Loading -->
<div *ngIf="loading" class="rd-page-state">
  <div class="rd-spinner"></div>
  <span>Loading...</span>
</div>

<!-- Error -->
<div *ngIf="pageError && !loading" class="rd-page-state rd-page-state--error">
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
  <span>{{ pageError }}</span>
  <button class="rd-back-link" (click)="goBack()">\u2190 Back to list</button>
</div>

<!-- Main -->
<div *ngIf="!loading && !pageError && config && record" class="record-detail">

  <!-- Header Card -->
  <div class="rd-header">
    <button class="rd-back-btn" (click)="goBack()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Back
    </button>

    <div class="rd-header-main">
      <div class="rd-header-text">
        <h1 class="rd-title">{{ recordTitle }}</h1>
        <p class="rd-subtitle" *ngIf="recordSubtitle">{{ recordSubtitle }}</p>
      </div>
      <span class="rd-status-badge">
        {{ recordStatus }}
      </span>
    </div>

    <div class="rd-header-actions">
      <button
        *ngFor="let action of visibleActions"
        class="rd-action-btn rd-action-btn--{{ action.style }}"
        (click)="executeAction(action.action)">
        {{ action.label }}
      </button>
    </div>
  </div>

  <!-- Tabs Card -->
  <div class="rd-tabs-card">

    <!-- Tab Navigation -->
    <nav class="rd-tab-nav">
      <button
        *ngFor="let tab of config.tabs"
        class="rd-tab-btn"
        [class.rd-tab-btn--active]="activeTab() === tab.key"
        (click)="selectTab(tab)">
        {{ tab.label }}
        <span *ngIf="tab.type === 'related-list' && tabCount(tab.key) > 0" class="rd-tab-count">
          {{ tabCount(tab.key) }}
        </span>
      </button>
    </nav>

    <!-- Tab Content -->
    <div class="rd-tab-body">

      <!-- OVERVIEW -->
      <ng-container *ngIf="currentTab?.type === 'overview'">
        <div *ngFor="let group of currentTab?.fieldGroups" class="rd-field-group">
          <h3 class="rd-group-label">{{ group.label }}</h3>
          <div class="rd-fields-grid">
            <div *ngFor="let field of group.fields" class="rd-field">
              <span class="rd-field-label">{{ field.label }}</span>
              <span class="rd-field-value">{{ fieldValue(field) }}</span>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- RELATED LIST -->
      <ng-container *ngIf="currentTab?.type === 'related-list'">

        @if (activeTab() === 'notes') {
          <div class="rd-notes-section" style="padding: 16px 0;">
            <div class="note-composer" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px;">
              <textarea class="rd-form-control rd-form-textarea" [(ngModel)]="newNoteContent" placeholder="Write a note..." rows="3" style="width: 100%; border-radius: 8px; border: 1px solid var(--crm-border); padding: 12px; background: var(--crm-bg); color: var(--crm-text-1); font-size: 0.88rem; outline: none; box-sizing: border-box; resize: vertical;"></textarea>
              <div style="display: flex; justify-content: flex-end;">
                <button class="rd-submit-btn" (click)="saveNote()" style="padding: 8px 16px; font-size: 0.8rem;" [disabled]="!newNoteContent.trim()">Add Note</button>
              </div>
            </div>
            <div class="notes-list" style="display: flex; flex-direction: column; gap: 16px;">
              <div *ngFor="let note of notes()" class="note-card" style="background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.01); display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--crm-border); padding-bottom: 8px;">
                  <span style="font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2);">By {{ note.createdBy }}</span>
                  <span style="font-size: 0.72rem; color: var(--crm-text-4);">{{ note.createdAt | date:'medium' }}</span>
                </div>
                @if (editingNoteId === note.id) {
                  <textarea class="rd-form-control" [(ngModel)]="editingNoteContent" rows="3" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 10px; background: var(--crm-bg); color: var(--crm-text-1); outline: none; box-sizing: border-box; resize: vertical;"></textarea>
                  <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="rd-cancel-btn" (click)="cancelEditNote()" style="padding: 4px 10px; font-size: 0.75rem;">Cancel</button>
                    <button class="rd-submit-btn" (click)="updateNote(note.id)" style="padding: 4px 10px; font-size: 0.75rem;">Save</button>
                  </div>
                } @else {
                  <p style="margin: 0; font-size: 0.85rem; color: var(--crm-text-1); white-space: pre-wrap; line-height: 1.5;">{{ note.content }}</p>
                  <div style="display: flex; justify-content: flex-end; gap: 12px; font-size: 0.75rem; border-top: 1px dashed var(--crm-border); padding-top: 8px; margin-top: 4px;">
                    <button (click)="startEditNote(note)" style="background: none; border: none; color: var(--crm-primary); cursor: pointer; font-weight: 600; padding: 0;">Edit</button>
                    <button (click)="deleteNote(note.id)" style="background: none; border: none; color: var(--crm-danger); cursor: pointer; font-weight: 600; padding: 0;">Delete</button>
                  </div>
                }
              </div>
              <div *ngIf="notes().length === 0" style="text-align: center; padding: 40px 24px; color: var(--crm-text-4); font-size: 0.85rem; border: 1px dashed var(--crm-border); border-radius: 12px; background: var(--crm-card);">No notes added to this record yet.</div>
            </div>
          </div>
        }

        @else if (activeTab() === 'attachments') {
          <div class="rd-attachments-section" style="padding: 16px 0;">
            <div class="attachment-uploader" style="border: 2px dashed var(--crm-border); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; background: var(--crm-bg); display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--crm-text-4)" stroke-width="1.5" style="margin-bottom: 4px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p style="margin: 0; font-size: 0.82rem; color: var(--crm-text-2); font-weight: 500;">PDF, DOCX, XLSX, Images, or ZIP (max 10MB)</p>
              <input type="file" id="fileUploadInput" (change)="onFileSelected($event)" style="display: none;" />
              <button class="rd-add-btn" (click)="triggerFileInput()" style="margin: 4px auto 0;">Select File</button>
              <div *ngIf="selectedUploadFile" style="margin-top: 12px; font-size: 0.8rem; font-weight: 600; color: var(--crm-primary); display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: var(--crm-primary-soft); border-radius: 8px; border: 1px solid rgba(15, 52, 96, 0.15);">
                <span>{{ selectedUploadFile.name }} ({{ formatBytes(selectedUploadFile.size) }})</span>
                <button class="rd-submit-btn" (click)="uploadAttachment()" style="padding: 4px 10px; font-size: 0.72rem;">Upload File</button>
              </div>
            </div>
            <div class="attachments-list" style="display: flex; flex-direction: column; gap: 12px;">
              <div *ngFor="let att of attachments()" class="attachment-card" style="background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.01);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--crm-primary)" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--crm-text-1);">{{ att.fileName }}</span>
                    <span style="font-size: 0.72rem; color: var(--crm-text-3);">Version {{ att.version }} &bull; {{ formatBytes(att.fileSize) }} &bull; By {{ att.createdBy }} &bull; {{ att.createdAt | date:'short' }}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <a [href]="getDownloadUrl(att)" download class="rd-row-btn" style="text-decoration: none; display: inline-flex; align-items: center; font-size: 0.72rem; padding: 6px 12px; border: 1px solid var(--crm-border); border-radius: 6px; color: var(--crm-primary); background: var(--crm-card); font-weight: 600;">Download</a>
                  <button (click)="deleteAttachment(att.id)" class="rd-row-btn" style="color: var(--crm-danger); font-size: 0.72rem; padding: 6px 12px; border: 1px solid var(--crm-border); border-radius: 6px; background: var(--crm-card); font-weight: 600;">Delete</button>
                </div>
              </div>
              <div *ngIf="attachments().length === 0" style="text-align: center; padding: 40px 24px; color: var(--crm-text-4); font-size: 0.85rem; border: 1px dashed var(--crm-border); border-radius: 12px; background: var(--crm-card);">No attachments uploaded yet.</div>
            </div>
          </div>
        }

        @else if (activeTab() === 'timeline') {
          <div class="rd-timeline-section" style="position: relative; padding: 16px 0 16px 24px;">
            <div style="position: absolute; top: 16px; bottom: 16px; left: 8px; width: 2px; background: var(--crm-border);"></div>
            <div class="timeline-list" style="display: flex; flex-direction: column; gap: 24px;">
              <div *ngFor="let item of timeline()" class="timeline-item" style="position: relative;">
                <div style="position: absolute; left: -21px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--crm-primary); border: 2px solid var(--crm-card);"></div>
                <div style="display: flex; flex-direction: column; gap: 4px; background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 12px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.01);">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--crm-border); padding-bottom: 6px; margin-bottom: 4px;">
                    <span style="font-size: 0.82rem; font-weight: 600; color: var(--crm-text-1);">{{ item.action }}</span>
                    <span style="font-size: 0.72rem; color: var(--crm-text-4);">{{ item.createdAt | date:'medium' }}</span>
                  </div>
                  <p *ngIf="item.description" style="margin: 0; font-size: 0.8rem; color: var(--crm-text-2); line-height: 1.4;">{{ item.description }}</p>
                  <span style="font-size: 0.72rem; color: var(--crm-text-4); font-weight: 600; margin-top: 2px;">Performed by: {{ item.performedBy }}</span>
                </div>
              </div>
              <div *ngIf="timeline().length === 0" style="text-align: center; padding: 40px 24px; color: var(--crm-text-4); font-size: 0.85rem; border: 1px dashed var(--crm-border); border-radius: 12px; background: var(--crm-card);">No timeline updates available.</div>
            </div>
          </div>
        }

        @else {
          <div class="rd-related-header">
            <span class="rd-related-count">{{ tabCount(activeTab()) }} record{{ tabCount(activeTab()) !== 1 ? 's' : '' }}</span>
            <button *ngIf="currentTab?.addLabel" class="rd-add-btn" (click)="openAddPanel(currentTab!)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {{ currentTab?.addLabel }}
            </button>
          </div>
          <div *ngIf="isTabLoading(activeTab())" class="rd-tab-loading"><div class="rd-spinner rd-spinner--sm"></div></div>
          <div *ngIf="!isTabLoading(activeTab()) && tabRows(activeTab()).length === 0" class="rd-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>No {{ currentTab?.label?.toLowerCase() }} records yet.</span>
            <button *ngIf="currentTab?.addLabel" class="rd-add-btn rd-add-btn--empty" (click)="openAddPanel(currentTab!)">+ {{ currentTab?.addLabel }}</button>
          </div>
          <div *ngIf="!isTabLoading(activeTab()) && tabRows(activeTab()).length > 0" class="rd-table-wrap">
            <table class="rd-table">
              <thead><tr>
                <th *ngFor="let col of currentTab?.columns">{{ col.label }}</th>
                <th class="rd-th-actions">Actions</th>
              </tr></thead>
              <tbody>
                <tr *ngFor="let row of tabRows(activeTab())" [class.rd-row-clickable]="activeTab() === 'quotes' || activeTab() === 'invoices'">
                  <td *ngFor="let col of currentTab?.columns">{{ cellValue(row, col) }}</td>
                  <td class="rd-td-actions">
                    <ng-container *ngIf="activeTab() === 'activities'">
                      <button *ngIf="row['status'] !== 'Completed'" class="rd-row-btn" (click)="rowAction('complete-activity', row, 'activities')">Complete</button>
                      <span *ngIf="row['status'] === 'Completed'" class="rd-done-label">Done</span>
                    </ng-container>
                    <ng-container *ngIf="activeTab() === 'tasks'">
                      <button *ngIf="row['status'] !== 'COMPLETED'" class="rd-row-btn" (click)="rowAction('complete-task', row, 'tasks')">Complete</button>
                      <span *ngIf="row['status'] === 'COMPLETED'" class="rd-done-label">Done</span>
                    </ng-container>
                    <ng-container *ngIf="activeTab() === 'quotes'">
                      <button *ngIf="row['status'] === 'Draft'" class="rd-row-btn" (click)="rowAction('send-quote', row, 'quotes')">Send</button>
                      <button *ngIf="row['status'] === 'Sent'" class="rd-row-btn rd-row-btn--success" (click)="rowAction('accept-quote', row, 'quotes')">Accept</button>
                      <button *ngIf="row['status'] === 'Accepted'" class="rd-row-btn rd-row-btn--primary" (click)="rowAction('generate-invoice', row, 'quotes')">Generate Invoice</button>
                      <span *ngIf="row['status'] === 'Rejected'" class="rd-done-label rd-done-label--rejected">Rejected</span>
                    </ng-container>
                    <ng-container *ngIf="activeTab() === 'deals'"><span class="rd-stage-badge">{{ row['stage'] }}</span></ng-container>
                    <ng-container *ngIf="activeTab() === 'invoices'"><span class="rd-status-chip">{{ row['status'] }}</span></ng-container>
                    <ng-container *ngIf="activeTab() === 'contacts'"><span class="rd-stage-badge">{{ row['status'] }}</span></ng-container>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        }
      </ng-container>

    </div>
  </div>
</div>

<!-- Add Panel -->
<ng-container *ngIf="addPanelOpen">
  <div class="rd-overlay" (click)="closeAddPanel()"></div>
  <aside class="rd-add-panel">
    <div class="rd-add-panel-head">
      <span>{{ addPanelTab?.addLabel }}</span>
      <button class="rd-panel-close" (click)="closeAddPanel()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="rd-add-panel-body">
      <ng-container *ngIf="addPanelTab?.addMethod !== 'auto'">
        <div *ngFor="let field of addPanelTab?.addFields" class="rd-form-row">
          <label class="rd-form-label">{{ field.label }}</label>
          <ng-container *ngIf="isOwnershipField(field.name); else defaultFieldBlock">
            <select *ngIf="isAdminUser()" class="rd-form-control" [(ngModel)]="addForm[field.name]">
              <option value="">-- Select Owner --</option>
              <option *ngFor="let u of salesUsers()" [value]="u.username">{{ u.fullName }} ({{ u.username }})</option>
            </select>
            <input *ngIf="!isAdminUser()" class="rd-form-control" type="text" [ngModel]="addForm[field.name]" [disabled]="true">
          </ng-container>
          <ng-template #defaultFieldBlock>
            <select *ngIf="field.type === 'select'" class="rd-form-control" [(ngModel)]="addForm[field.name]">
              <option value="">Select {{ field.label }}...</option>
              <option *ngFor="let opt of field.options" [value]="opt.value">{{ opt.label }}</option>
            </select>
            <input *ngIf="field.type === 'input'" class="rd-form-control" type="text" [(ngModel)]="addForm[field.name]" [placeholder]="field.label">
            <input *ngIf="field.type === 'date'" class="rd-form-control" type="date" [(ngModel)]="addForm[field.name]">
            <input *ngIf="field.type === 'number'" class="rd-form-control" type="number" [(ngModel)]="addForm[field.name]">
            <textarea *ngIf="field.type === 'textarea'" class="rd-form-control rd-form-textarea" [(ngModel)]="addForm[field.name]" [placeholder]="field.label" rows="3"></textarea>
          </ng-template>
        </div>
      </ng-container>
      <ng-container *ngIf="addPanelTab?.addMethod === 'auto'">
        <p class="rd-auto-msg">Click <strong>Create</strong> to automatically generate a {{ addPanelTab?.addLabel?.toLowerCase() }} from this record. All fields will be pre-populated.</p>
      </ng-container>
      <div *ngIf="addError" class="rd-add-error">{{ addError }}</div>
    </div>
    <div class="rd-add-panel-foot">
      <button class="rd-cancel-btn" (click)="closeAddPanel()">Cancel</button>
      <button class="rd-submit-btn" (click)="submitAddForm()" [disabled]="addSubmitting">
        {{ addSubmitting ? 'Saving\u2026' : (addPanelTab?.addMethod === 'auto' ? 'Create' : 'Save') }}
      </button>
    </div>
  </aside>
</ng-container>

<!-- Edit Form Drawer -->
<o-form-drawer
  [open]="editDrawerOpen"
  [title]="editDrawerTitle"
  [steps]="editSteps"
  [rowData]="editDrawerRowData"
  [showSubmit]="true"
  [readOnly]="false"
  [actionType]="'edit'"
  (closeDrawer)="editDrawerOpen = false"
  (save)="onEditSave($event)">
</o-form-drawer>
  `,
  styles: [`
.record-detail{padding:24px;display:flex;flex-direction:column;gap:16px;min-height:calc(100vh - 60px);background:var(--crm-bg)}.rd-page-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:calc(100vh - 100px);color:var(--crm-text-2);font-size:.9rem}.rd-page-state--error{color:var(--crm-danger)}.rd-back-link{background:none;border:none;color:var(--crm-primary);cursor:pointer;font-size:.85rem;text-decoration:underline}.rd-spinner{width:32px;height:32px;border:3px solid var(--crm-border);border-top-color:var(--crm-primary);border-radius:50%;animation:rd-spin .7s linear infinite}.rd-spinner--sm{width:20px;height:20px;border-width:2px}@keyframes rd-spin{to{transform:rotate(360deg)}}.rd-header{background:var(--crm-card);border:1px solid var(--crm-border);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}.rd-back-btn{display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--crm-border);border-radius:8px;padding:6px 12px;color:var(--crm-text-2);font-size:.8rem;font-weight:500;cursor:pointer;flex-shrink:0;transition:all .15s}.rd-back-btn:hover{background:var(--crm-hover);color:var(--crm-text-1)}.rd-header-main{flex:1;display:flex;align-items:center;gap:12px;min-width:0}.rd-header-text{min-width:0}.rd-title{margin:0;font-size:1.1rem;font-weight:700;color:var(--crm-text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rd-subtitle{margin:2px 0 0;font-size:.8rem;color:var(--crm-text-3)}.rd-status-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-size:.72rem;font-weight:600;background:#4338ca1a;color:var(--crm-primary);white-space:nowrap;flex-shrink:0}.rd-status-badge--closed-won{background:#10b9811f;color:#059669}.rd-status-badge--closed-lost{background:#ef44441a;color:var(--crm-danger)}.rd-status-badge--qualified{background:#f59e0b1a;color:#d97706}.rd-status-badge--converted{background:#10b9811f;color:#059669}.rd-status-badge--new{background:#64748b1a;color:var(--crm-text-2)}.rd-status-badge--active{background:#10b9811f;color:#059669}.rd-status-badge--inactive{background:#ef44441a;color:var(--crm-danger)}.rd-header-actions{display:flex;gap:8px;flex-wrap:wrap}.rd-action-btn{padding:7px 16px;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;border:none;transition:all .15s}.rd-action-btn--primary{background:var(--crm-primary);color:#fff}.rd-action-btn--primary:hover{background:var(--crm-primary-dark)}.rd-action-btn--secondary{background:none;border:1px solid var(--crm-border);color:var(--crm-text-1)}.rd-action-btn--secondary:hover{background:var(--crm-hover)}.rd-action-btn--danger{background:#dc262614;border:1px solid rgba(220,38,38,.2);color:var(--crm-danger)}.rd-action-btn--danger:hover{background:var(--crm-danger);color:#fff}.rd-action-btn--success{background:#10b9811a;border:1px solid rgba(16,185,129,.3);color:#059669}.rd-action-btn--success:hover{background:#059669;color:#fff}.rd-tabs-card{background:var(--crm-card);border:1px solid var(--crm-border);border-radius:12px;overflow:hidden;flex:1}.rd-tab-nav{display:flex;gap:0;border-bottom:1px solid var(--crm-border);background:var(--crm-hover);overflow-x:auto;padding:0 8px}.rd-tab-nav::-webkit-scrollbar{display:none}.rd-tab-btn{display:flex;align-items:center;gap:6px;padding:12px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--crm-text-2);font-size:.82rem;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s;margin-bottom:-1px}.rd-tab-btn:hover{color:var(--crm-text-1)}.rd-tab-btn--active{color:var(--crm-primary);border-bottom-color:var(--crm-primary);font-weight:600}.rd-tab-count{background:var(--crm-primary);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:99px;min-width:18px;text-align:center}.rd-tab-body{padding:20px}.rd-field-group{margin-bottom:24px}.rd-group-label{margin:0 0 12px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--crm-text-3);padding-bottom:8px;border-bottom:1px solid var(--crm-border)}.rd-fields-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px 24px}.rd-field{display:flex;flex-direction:column;gap:3px}.rd-field-label{font-size:.72rem;font-weight:600;color:var(--crm-text-3);text-transform:uppercase;letter-spacing:.04em}.rd-field-value{font-size:.88rem;font-weight:500;color:var(--crm-text-1);word-break:break-word}.rd-related-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.rd-related-count{font-size:.8rem;color:var(--crm-text-3)}.rd-add-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;background:var(--crm-primary);color:#fff;border:none;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;transition:background .15s}.rd-add-btn:hover{background:var(--crm-primary-dark)}.rd-add-btn--empty{background:none;border:1px dashed var(--crm-border);color:var(--crm-primary)}.rd-add-btn--empty:hover{background:#4338ca0f}.rd-tab-loading{display:flex;justify-content:center;padding:40px}.rd-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px 24px;color:var(--crm-text-3);font-size:.85rem}.rd-table-wrap{overflow-x:auto;border:1px solid var(--crm-border);border-radius:8px}.rd-table{width:100%;border-collapse:collapse;font-size:.83rem}.rd-table th,.rd-table td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--crm-border)}.rd-table th{background:var(--crm-hover);color:var(--crm-text-3);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.rd-table td{color:var(--crm-text-1)}.rd-table tr:last-child td{border-bottom:none}.rd-table tbody tr:hover td{background:var(--crm-hover)}.rd-table .rd-th-actions,.rd-table .rd-td-actions{width:120px;text-align:right}.rd-table .rd-td-actions{display:flex;justify-content:flex-end;gap:6px;flex-wrap:nowrap}.rd-row-btn{padding:4px 10px;border-radius:6px;font-size:.72rem;font-weight:600;cursor:pointer;border:1px solid var(--crm-border);background:none;color:var(--crm-text-1);white-space:nowrap;transition:all .12s}.rd-row-btn:hover{background:var(--crm-hover)}.rd-row-btn--primary{background:var(--crm-primary);border-color:var(--crm-primary);color:#fff}.rd-row-btn--primary:hover{background:var(--crm-primary-dark)}.rd-row-btn--success{background:#10b9811a;border-color:#10b9814d;color:#059669}.rd-row-btn--success:hover{background:#059669;color:#fff}.rd-done-label{font-size:.72rem;font-weight:600;color:#059669}.rd-done-label--rejected{color:var(--crm-danger)}.rd-stage-badge{display:inline-block;padding:2px 8px;background:#4338ca14;color:var(--crm-primary);border-radius:99px;font-size:.7rem;font-weight:600}.rd-status-chip{display:inline-block;padding:2px 8px;border-radius:99px;font-size:.7rem;font-weight:600;background:#64748b1a;color:var(--crm-text-2)}.rd-status-chip--paid{background:#10b9811f;color:#059669}.rd-status-chip--sent{background:#f59e0b1a;color:#d97706}.rd-status-chip--overdue{background:#ef44441a;color:var(--crm-danger)}.rd-status-chip--draft{background:#64748b1a;color:var(--crm-text-2)}.rd-overlay{position:fixed;inset:0;background:#00000040;z-index:200}.rd-add-panel{position:fixed;top:0;right:0;height:100vh;width:380px;background:var(--crm-card);border-left:1px solid var(--crm-border);box-shadow:-8px 0 32px #0000001f;z-index:201;display:flex;flex-direction:column}.rd-add-panel-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--crm-border);font-size:.9rem;font-weight:700;color:var(--crm-text-1)}.rd-panel-close{background:none;border:none;cursor:pointer;color:var(--crm-text-3);padding:4px;border-radius:6px;display:flex;align-items:center}.rd-panel-close:hover{background:var(--crm-hover);color:var(--crm-text-1)}.rd-add-panel-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}.rd-form-row{display:flex;flex-direction:column;gap:5px}.rd-form-label{font-size:.75rem;font-weight:600;color:var(--crm-text-2)}.rd-form-control{padding:8px 12px;border:1px solid var(--crm-border);border-radius:8px;font-size:.84rem;color:var(--crm-text-1);background:var(--crm-bg);outline:none;transition:border-color .15s;width:100%;box-sizing:border-box}.rd-form-control:focus{border-color:var(--crm-primary);background:#fff}.rd-form-textarea{resize:vertical;min-height:80px}.rd-auto-msg{margin:0;font-size:.85rem;color:var(--crm-text-2);line-height:1.6;padding:20px;background:#4338ca0a;border:1px solid rgba(67,56,202,.12);border-radius:8px}.rd-add-error{padding:10px 14px;background:#dc26260f;border:1px solid rgba(220,38,38,.2);border-radius:8px;color:var(--crm-danger);font-size:.82rem}.rd-add-panel-foot{display:flex;gap:10px;padding:16px 20px;border-top:1px solid var(--crm-border);justify-content:flex-end}.rd-cancel-btn{padding:8px 18px;border-radius:8px;border:1px solid var(--crm-border);background:none;font-size:.82rem;font-weight:600;color:var(--crm-text-2);cursor:pointer}.rd-cancel-btn:hover{background:var(--crm-hover)}.rd-submit-btn{padding:8px 20px;border-radius:8px;border:none;background:var(--crm-primary);color:#fff;font-size:.82rem;font-weight:600;cursor:pointer;transition:background .15s}.rd-submit-btn:hover:not(:disabled){background:var(--crm-primary-dark)}.rd-submit-btn:disabled{opacity:.6;cursor:not-allowed}.rd-row-clickable{cursor:pointer;transition:background-color .15s ease}.rd-row-clickable:hover td{background:var(--crm-hover)}\n
  `]
})
export class CrmDetailComponent extends RecordDetailComponent {
  private readonly myHttp = inject(HttpClient);
  private readonly myRoute = inject(ActivatedRoute);
  private readonly myCdr = inject(ChangeDetectorRef);
  private readonly myApiBase = inject(ORQUE_API_URL);
  private readonly mySubs = new Subscription();

  editDrawerOpen = false;
  editDrawerTitle = '';
  editDrawerRowData: any = null;
  editSteps: any[] = [];

  constructor(
    route: ActivatedRoute,
    router: Router,
    http: HttpClient,
    cdr: ChangeDetectorRef,
    @Inject(ORQUE_API_URL) apiBase: string
  ) {
    super(route, router, http, cdr, apiBase);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadListSteps();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.mySubs.unsubscribe();
  }

  private self(): any {
    return this as any;
  }

  private loadListSteps(): void {
    const resource = this.myRoute.snapshot.data['resource'];
    this.mySubs.add(
      this.myHttp.get(`/page-configs/${resource}.json`).subscribe({
        next: (cfg: any) => {
          this.editSteps = cfg?.steps || [];
        }
      })
    );
  }

  override executeAction(action: string): void {
    if (action === 'edit') {
      this.openEditDrawer();
      return;
    }
    super.executeAction(action);
  }

  private openEditDrawer(): void {
    this.editDrawerTitle = `Edit ${this.recordTitle}`;
    this.editDrawerRowData = { ...this.record };
    this.editDrawerOpen = true;
    this.myCdr.detectChanges();
  }

  onEditSave(payload: any): void {
    const id = this.record?.['id'];
    if (!id || !this.config) return;

    const base: string = this.self().base;
    const url = `${base}${this.config.api}/${id}`;
    const headers = this.self().hdrs();
    this.mySubs.add(
      this.myHttp.put(url, payload, { headers }).subscribe({
        next: (updated: any) => {
          this.record = updated;
          this.editDrawerOpen = false;
          this.myCdr.detectChanges();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Save failed.';
          console.error('[CRM]', msg);
          alert(msg);
        }
      })
    );
  }
}
