import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PageRendererComponent, PageAction, PageConfig, OToastService, OCalendarComponent, CalendarDay, CalendarDayEvent } from 'orque-ui';
import { PageStoreService } from '../../core/services/page-store.service';
import { KanbanComponent } from './kanban';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageRendererComponent, KanbanComponent, OCalendarComponent],
  template: `
    <div class="lp-container">
      @if (page && canShowKanban()) {
        <div class="lp-toolbar">
          <div class="lp-view-toggle">
            <button [class.active]="viewMode === 'table'" (click)="viewMode = 'table'" class="lp-toggle-btn">Table View</button>
            <button [class.active]="viewMode === 'kanban'" (click)="viewMode = 'kanban'" class="lp-toggle-btn">Kanban Board</button>
          </div>
        </div>
      }

      @if (loading && !page && !isCustomResource()) {
        <div class="lp-loader">
          <div class="lp-spinner"></div>
          <p>Loading...</p>
        </div>
      }

      @if (error && !isCustomResource()) {
        <div class="lp-error">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
          <span>{{ error }}</span>
        </div>
      }

      <!-- Dynamic Custom Modules -->
      @if (resource === 'calendar') {
        <div class="cal-container">
          <div class="cal-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 1px solid var(--crm-border); padding-bottom: 20px;">
            <div>
              <h2 class="cal-title">Calendar Workspace</h2>
              <p class="cal-subtitle">Track your client intro calls, meetings, follow-ups, and demo dates.</p>
              <div style="font-size: 0.74rem; color: var(--crm-text-4); margin-top: 4px; font-weight: 500;">
                Current Time Zone: <strong>Asia/Kolkata (IST)</strong> | Working Hours: <strong>09:00 AM - 05:00 PM</strong>
              </div>
            </div>
            
            <div style="display: flex; gap: 10px; align-items: center;">
              <button [class.active]="calendarSubMode === 'calendar'" (click)="calendarSubMode = 'calendar'" style="padding: 6px 14px; font-size: 0.78rem; font-weight: 600; border-radius: 6px; border: 1px solid var(--crm-border); background: var(--crm-card); color: var(--crm-text-2); cursor: pointer;" [style.border-color]="calendarSubMode === 'calendar' ? 'var(--crm-primary)' : ''" [style.color]="calendarSubMode === 'calendar' ? 'var(--crm-primary)' : ''">Calendar</button>
              <button [class.active]="calendarSubMode === 'scheduler'" (click)="calendarSubMode = 'scheduler'" style="padding: 6px 14px; font-size: 0.78rem; font-weight: 600; border-radius: 6px; border: 1px solid var(--crm-border); background: var(--crm-card); color: var(--crm-text-2); cursor: pointer;" [style.border-color]="calendarSubMode === 'scheduler' ? 'var(--crm-primary)' : ''" [style.color]="calendarSubMode === 'scheduler' ? 'var(--crm-primary)' : ''">Meeting Scheduler</button>
              
              <button (click)="syncCalendarProvider('google')" class="em-btn" style="background: rgba(219, 68, 85, 0.1); border-color: rgba(219, 68, 85, 0.3); color: #db4437; padding: 6px 12px; font-size: 0.76rem;">
                Sync Google
              </button>
              <button (click)="syncCalendarProvider('outlook')" class="em-btn" style="background: rgba(0, 120, 215, 0.1); border-color: rgba(0, 120, 215, 0.3); color: #0078d7; padding: 6px 12px; font-size: 0.76rem;">
                Sync Outlook
              </button>
            </div>
          </div>

          <!-- Main Mode Selector -->
          @if (calendarSubMode === 'calendar') {
            <div class="cal-card">
              @if (loadingCustom) {
                <div class="cal-loading">Loading events...</div>
              } @else {
                <o-calendar 
                  [days]="calendarDays" 
                  [currentDate]="calendarCurrentDate"
                  (monthChange)="onCalendarMonthChange($event)"
                  (dayClick)="onCalendarDayClick($event)">
                </o-calendar>
              }
            </div>
            
            @if (selectedCalendarDay) {
              <div class="cal-details">
                <div class="cal-details-grid">
                  <div class="cal-details-left">
                    <h3 class="details-title">Events for {{ selectedCalendarDay.date | date:'longDate' }}</h3>
                    @if (selectedCalendarDay.events.length) {
                      <div class="details-list">
                        @for (ev of selectedCalendarDay.events; track ev.label) {
                          <div class="details-item" [attr.data-status]="ev.status">
                            <span class="details-badge">{{ ev.status }}</span>
                            <span class="details-label">{{ ev.label }}</span>
                          </div>
                        }
                      </div>
                    } @else {
                      <p class="details-empty">No events scheduled for this day.</p>
                    }
                  </div>
                  
                  <div class="cal-details-right">
                    <h3 class="details-title">Create New Event</h3>
                    <div class="cal-event-form">
                      <div class="form-group" style="margin-bottom: 12px;">
                        <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">Event Title</label>
                        <input type="text" [(ngModel)]="newEventTitle" placeholder="e.g. Onboarding Call" class="form-input" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;">
                      </div>
                      <div class="form-group" style="margin-bottom: 12px;">
                        <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">Description</label>
                        <input type="text" [(ngModel)]="newEventDesc" placeholder="e.g. Kickoff project scope" class="form-input" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;">
                      </div>
                      <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">Assign To</label>
                        <select [(ngModel)]="newEventAssign" class="form-input" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;">
                          <option value="Admin">Admin</option>
                          <option value="Demo Sales">Demo Sales</option>
                        </select>
                      </div>
                      <button class="em-btn em-btn-primary" (click)="createCalendarEvent()">Create Event</button>
                    </div>
                  </div>
                </div>
              </div>
            }
          } @else {
            <!-- Availability Slots Scheduler -->
            <div style="background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 18px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
              <h3 style="font-size: 1rem; font-weight: 600; color: var(--crm-text-1); margin: 0 0 16px;">Schedule a Meeting</h3>
              
              <div style="display: flex; gap: 20px; align-items: flex-end; margin-bottom: 24px;">
                <div style="flex: 1;">
                  <label style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">Select Date</label>
                  <input type="date" [(ngModel)]="schedulerDate" (change)="loadAvailableSlots()" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;" />
                </div>
                <div style="flex: 1;">
                  <label style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">Duration (Minutes)</label>
                  <select [(ngModel)]="schedulerDuration" (change)="loadAvailableSlots()" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;">
                    <option [value]="30">30 Minutes</option>
                    <option [value]="60">60 Minutes</option>
                  </select>
                </div>
              </div>

              @if (loadingSlots) {
                <div style="text-align: center; padding: 24px; color: var(--crm-text-3);">Checking slots availability...</div>
              } @else if (schedulerSlots.length === 0) {
                <div style="text-align: center; padding: 24px; color: var(--crm-text-4);">Choose a date to see availability slots</div>
              } @else {
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; margin-bottom: 24px;">
                  <button *ngFor="let slot of schedulerSlots" 
                          (click)="selectSlotToBook(slot)" 
                          [disabled]="!slot.available"
                          style="padding: 10px; border-radius: 8px; border: 1px solid var(--crm-border); font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; text-align: center;"
                          [style.background]="slot.available ? 'var(--crm-bg)' : 'rgba(0,0,0,0.03)'"
                          [style.color]="slot.available ? 'var(--crm-text-1)' : 'var(--crm-text-4)'"
                          [style.border-color]="slot.available ? 'var(--crm-primary-soft)' : ''">
                    {{ slot.time }}
                    <span style="display: block; font-size: 0.65rem; margin-top: 4px; font-weight: 500;" [style.color]="slot.available ? 'var(--crm-success)' : 'var(--crm-danger)'">
                      {{ slot.available ? 'Available' : 'Booked' }}
                    </span>
                  </button>
                </div>

                <!-- Booking Modal / Confirm Dialog -->
                <div *ngIf="selectedSlot" style="background: var(--crm-bg); border: 1px solid var(--crm-border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px;">
                  <h4 style="margin: 0; font-size: 0.9rem; font-weight: 600; color: var(--crm-text-2);">Book Slot: {{ selectedSlot.time }} on {{ schedulerDate }}</h4>
                  <div style="display: flex; gap: 16px;">
                    <input type="text" [(ngModel)]="slotBookingTitle" placeholder="Meeting Title (e.g. Intro Demo)" style="flex: 2; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-card); color: var(--crm-text-1); outline: none;" />
                    <button (click)="bookMeetingSlot()" style="flex: 1; padding: 8px 16px; background: var(--crm-primary); border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 600; color: #fff; cursor: pointer;">Confirm Booking</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      @else if (resource === 'reports') {
        <div class="rep-container">
          <div class="rep-header">
            <h2 class="rep-title">Reports & Metrics</h2>
            <p class="rep-subtitle">Analyze lead conversions, pipeline valuation, and revenue indicators.</p>
          </div>
          @if (loadingCustom) {
            <div class="rep-loading">Loading report analytics...</div>
          } @else {
            <div class="rep-grid">
              <div class="rep-card rep-summary">
                <h3 class="card-title">Performance KPI Summary</h3>
                <div class="kpi-group">
                  <div class="kpi-box"><span class="kpi-label">Lead Conversion Rate</span><span class="kpi-value">65.3%</span></div>
                  <div class="kpi-box"><span class="kpi-label">Forecasted Win Rate</span><span class="kpi-value">48.2%</span></div>
                  <div class="kpi-box"><span class="kpi-label">Average Deal Size</span><span class="kpi-value">₹3,40,000</span></div>
                </div>
              </div>
              <div class="rep-card">
                <h3 class="card-title">Pipeline Opportunity Breakdown</h3>
                <div class="bar-chart">
                  @for (item of reportsPipelineData; track item.label) {
                    <div class="bar-row">
                      <span class="bar-label">{{ item.label }}</span>
                      <div class="bar-fill-container"><div class="bar-fill" [style.width.%]="item.percentage" [style.background-color]="item.color"></div></div>
                      <span class="bar-value">₹{{ item.value | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>
              </div>
              <div class="rep-card">
                <h3 class="card-title">Conversion Funnel Stages</h3>
                <div class="funnel-chart">
                  <div class="funnel-stage" style="width: 100%; background: rgba(99, 102, 241, 0.9)"><span class="stage-name">Total Leads (100%)</span></div>
                  <div class="funnel-stage" style="width: 80%; background: rgba(99, 102, 241, 0.75)"><span class="stage-name">Qualified Leads (80%)</span></div>
                  <div class="funnel-stage" style="width: 55%; background: rgba(99, 102, 241, 0.6)"><span class="stage-name">Proposals Sent (55%)</span></div>
                  <div class="funnel-stage" style="width: 32%; background: rgba(16, 185, 129, 0.95)"><span class="stage-name">Closed Won (32%)</span></div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      @else if (resource === 'analytics') {
        <div class="an-container">
          <div class="an-header">
            <h2 class="an-title">Campaign Analytics</h2>
            <p class="an-subtitle">Monitor outbound metrics, click-through-rates, and delivery efficiency.</p>
          </div>
          @if (loadingCustom) {
            <div class="an-loading">Loading campaign metrics...</div>
          } @else {
            <div class="an-grid">
              <div class="an-card">
                <h3 class="card-title">Campaign Delivery Rates</h3>
                <div class="delivery-bar">
                  <div class="d-info"><span>Successful Deliveries</span><span class="d-val">96.6%</span></div>
                  <div class="d-track"><div class="d-fill" style="width: 96.6%; background: #10B981"></div></div>
                </div>
                <div class="delivery-bar">
                  <div class="d-info"><span>Email Open Rate</span><span class="d-val">65.3%</span></div>
                  <div class="d-track"><div class="d-fill" style="width: 65.3%; background: #3B82F6"></div></div>
                </div>
                <div class="delivery-bar">
                  <div class="d-info"><span>Response Rate</span><span class="d-val">28.4%</span></div>
                  <div class="d-track"><div class="d-fill" style="width: 28.4%; background: #F59E0B"></div></div>
                </div>
              </div>
              <div class="an-card scroll-card">
                <h3 class="card-title">Outbound Outreach Summary</h3>
                <div class="c-list">
                  @for (c of analyticsCampaigns; track c.id) {
                    <div class="c-item">
                      <div class="c-name-col"><span class="c-name">{{ c.campaignName }}</span><span class="c-subj">{{ c.subjectLine }}</span></div>
                      <div class="c-metrics-col">
                        <span class="c-badge" [attr.data-status]="c.status">{{ c.status }}</span>
                        <span class="c-date">Created: {{ c.createdAt | date:'shortDate' }}</span>
                      </div>
                    </div>
                  } @empty {
                    <div class="an-empty">No active outreach campaigns</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }

      @else if (resource === 'settings') {
        <div class="set-container">
          <div class="set-header">
            <h2 class="set-title">System Settings</h2>
            <p class="set-subtitle">Manage user profiles, check active configurations, and view license details.</p>
          </div>
          <div class="set-grid">
            <div class="set-card">
              <h3 class="card-title">User Account Info</h3>
              <div class="profile-summary">
                <span class="prof-avatar">{{ getCurrentUser().name ? getCurrentUser().name.charAt(0).toUpperCase() : 'U' }}</span>
                <div class="prof-info">
                  <span class="prof-name">{{ getCurrentUser().name || 'Unknown User' }}</span>
                  <span class="prof-role">{{ getCurrentUser().role || 'USER' }}</span>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="text" class="form-input" [value]="getCurrentUser().email || ''" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">Default Owner Handle</label>
                <input type="text" class="form-input" [value]="(getCurrentUser().name || 'user').toLowerCase()" disabled />
              </div>
            </div>
            <div class="set-card">
              <h3 class="card-title">Active License Subscription</h3>
              <p class="license-note">These subscription parameters are established at the corporate billing level and cannot be modified locally.</p>
              @if (loadingCustom) {
                <div class="license-loading">Loading license status...</div>
              } @else {
                <div class="form-group">
                  <label class="form-label">License Start Date</label>
                  <input type="text" class="form-input read-only-field" [value]="settingsLicenseInfo?.startDate | date:'longDate'" readonly />
                </div>
                <div class="form-group">
                  <label class="form-label">License End Date</label>
                  <input type="text" class="form-input read-only-field" [value]="settingsLicenseInfo?.endDate | date:'longDate'" readonly />
                </div>
                <div class="form-group">
                  <label class="form-label">Grace Period (Days)</label>
                  <input type="text" class="form-input read-only-field" [value]="settingsLicenseInfo?.gracePeriod" readonly />
                </div>
              }
            </div>
          </div>
        </div>
      }

      @else if (resource === 'emails') {
        <div class="em-container">
          <div class="em-header">
            <h2 class="em-title">Email Center</h2>
            <p class="em-subtitle">Sync corporate Gmail outreach, read responses, and manage template campaigns.</p>
          </div>
          <div class="em-grid">
            <div class="em-card em-list-card">
              <div class="em-list-header">
                <h3 class="card-title" style="margin: 0">Inbox</h3>
                <button class="em-btn em-btn-primary" (click)="composeEmail()">Compose</button>
              </div>
              <div class="em-list-container">
                @for (m of emails; track m.id) {
                  <div class="em-item" [class.selected]="selectedEmail?.id === m.id" (click)="selectEmail(m)">
                    <div class="em-item-top"><span class="em-from">{{ m.sender }}</span><span class="em-date">{{ m.date | date:'shortTime' }}</span></div>
                    <span class="em-subj">{{ m.subject }}</span>
                    <p class="em-snippet">{{ m.snippet }}</p>
                  </div>
                } @empty {
                  <div class="em-empty">No emails found</div>
                }
              </div>
            </div>
            <div class="em-card em-detail-card">
              @if (selectedEmail) {
                <div class="em-detail-header">
                  <h3 class="em-detail-subject">{{ selectedEmail.subject }}</h3>
                  <div class="em-detail-meta">
                    <div class="em-sender-row">
                      <span class="em-sender-avatar">{{ selectedEmail.sender[0] }}</span>
                      <div class="em-sender-info">
                        <span class="em-detail-from">{{ selectedEmail.sender }}</span>
                        <span class="em-detail-to">to me</span>
                      </div>
                    </div>
                    <span class="em-detail-date">{{ selectedEmail.date | date:'medium' }}</span>
                  </div>
                </div>
                <div class="em-detail-body"><p>{{ selectedEmail.body }}</p></div>
              } @else {
                <div class="em-detail-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 16px;display:block">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <p>Select an email to view its details</p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      @else if (page && !error) {
        <div class="lp-workspace-wrapper" style="position: relative; padding-bottom: 80px;">
          @if (viewMode === 'table') {
            @if (resource === 'quotes' || resource === 'invoices') {
              <div class="custom-table-container">
                <table class="custom-data-table">
                  <thead>
                    <tr>
                      <th class="chk-col"></th>
                      <th *ngFor="let col of page?.tableList || []" style="position: relative;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;">
                          <span>{{ col.label }}</span>
                          <div style="position: relative; display: inline-flex; align-items: center;" (click)="$event.stopPropagation()">
                            <button class="th-filter-btn" [class.active]="hasFilter(col.name)" (click)="toggleFilterPopup(col.name)" style="background: none; border: none; padding: 4px; color: var(--crm-text-3); cursor: pointer; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.12s;" type="button">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                              </svg>
                            </button>
                            
                            @if (activeFilterField === col.name) {
                              <div class="th-filter-popup" style="position: absolute; top: 100%; right: 0; margin-top: 8px; width: 220px; background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); padding: 12px; z-index: 50; text-align: left; white-space: normal; display: flex; flex-direction: column; gap: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                  <span style="font-size: 0.78rem; font-weight: 600; color: var(--crm-text-1);">Filter {{ col.label }}</span>
                                  <button (click)="closeFilterPopup()" style="background: none; border: none; font-size: 1.1rem; color: var(--crm-text-3); cursor: pointer; line-height: 1; padding: 0 4px;" type="button">×</button>
                                </div>
                                <div>
                                  <input type="text" 
                                         [value]="tempFilters[col.name] || ''"
                                         (input)="onFilterInput($event, col.name)"
                                         (keydown.enter)="applyFilter(col.name)"
                                         placeholder="Search value..." 
                                         style="width: 100%; border: 1px solid var(--crm-border); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; outline: none; background: var(--crm-bg); color: var(--crm-text-1);" />
                                </div>
                                <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 4px;">
                                  <button (click)="clearFilter(col.name)" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 600; border-radius: 4px; cursor: pointer; border: 1px solid var(--crm-border); background: none; color: var(--crm-text-2);" type="button">Clear</button>
                                  <button (click)="applyFilter(col.name)" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 600; border-radius: 4px; cursor: pointer; border: none; background: var(--crm-primary); color: #fff;" type="button">Apply</button>
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      </th>
                      <th class="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of filteredTableData" [class.selected]="selectedRow?.id === row.id">
                      <td class="chk-col">
                        <input type="checkbox" [checked]="selectedRow?.id === row.id" (change)="toggleSelectRow(row)" class="row-chk" />
                      </td>
                      <td *ngFor="let col of page?.tableList || []">
                        @if (col.pipe === 'date') {
                          {{ row[col.name] | date:'mediumDate' }}
                        } @else if (col.pipe === 'status') {
                          <span class="status-badge" [attr.data-status]="row[col.name]">{{ row[col.name] }}</span>
                        } @else {
                          {{ row[col.name] || '—' }}
                        }
                      </td>
                      <td class="actions-col">
                        <button class="row-action-btn" (click)="handleAction({ action: 'view', row: row })">View</button>
                      </td>
                    </tr>
                    <tr *ngIf="filteredTableData.length === 0">
                      <td [attr.colspan]="(page?.tableList?.length ?? 0) + 2" class="empty-row">No records found</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            } @else {
              <o-page-renderer [page]="page" [data]="data" (actionTriggered)="handleAction($event)" (selectionChange)="onSelectionChanged($event)"></o-page-renderer>
            }
          } @else {
            <app-kanban [resource]="resource" [data]="data" (action)="handleAction($event)"></app-kanban>
          }

          <!-- Floating Bottom Bar for PDF operations -->
          <div class="pdf-floating-bar" [style.left]="sidebarOffset" *ngIf="selectedRow && (resource === 'quotes' || resource === 'invoices')">
            <div class="pdf-bar-left">
              <button class="pdf-bar-close-btn" (click)="selectedRow = null">Close</button>
              <span class="pdf-bar-row-info">
                <strong>Selected {{ resource === 'invoices' ? 'Invoice' : 'Quote' }}:</strong> 
                {{ selectedRow.invoiceNumber || selectedRow.quoteNumber }} (₹{{ selectedRow.amount }})
              </span>
            </div>
            <div class="pdf-bar-right">
              @if (resource === 'quotes') {
                <button class="pdf-bar-action-btn pdf-btn-secondary" (click)="generateInvoiceFromQuote()" [disabled]="pdfDownloading || selectedRow.status !== 'Accepted'">
                  Generate Invoice
                </button>
                <button class="pdf-bar-action-btn pdf-btn-primary" (click)="downloadPdfForSelected('quotes')" [disabled]="pdfDownloading">
                  {{ pdfDownloading ? 'Generating...' : 'Generate Quotation' }}
                </button>
              }
              @if (resource === 'invoices') {
                <button class="pdf-bar-action-btn pdf-btn-primary" (click)="downloadPdfForSelected('invoices')" [disabled]="pdfDownloading">
                  {{ pdfDownloading ? 'Generating...' : 'Generate Invoice' }}
                </button>
              }
            </div>
          </div>

          <!-- Floating Bottom Bar for Bulk operations -->
          <div class="pdf-floating-bar" [style.left]="sidebarOffset" *ngIf="selectedBulkRows.length > 0 && resource !== 'quotes' && resource !== 'invoices'">
            <div class="pdf-bar-left">
              <button class="pdf-bar-close-btn" (click)="clearBulkSelection()">Cancel</button>
              <span class="pdf-bar-row-info">
                <strong>Selected {{ selectedBulkRows.length }} {{ resource }}:</strong> 
              </span>
            </div>
            <div class="pdf-bar-right">
              <button class="pdf-bar-action-btn pdf-btn-secondary" (click)="openBulkEditDrawer()" style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); color: var(--crm-primary);">
                Bulk Edit
              </button>
              <button class="pdf-bar-action-btn pdf-btn-secondary" (click)="openBulkAssignDrawer()" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #D97706;">
                Bulk Assign
              </button>
              <button class="pdf-bar-action-btn pdf-btn-secondary" (click)="openBulkStatusDrawer()" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669;" *ngIf="resource === 'leads' || resource === 'deals' || resource === 'accounts'">
                Bulk Status
              </button>
              <button class="pdf-bar-action-btn pdf-btn-secondary" (click)="bulkDeleteSelected()" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--crm-danger);">
                Bulk Delete
              </button>
            </div>
          </div>

          <!-- Bulk Action Modals -->
          <div *ngIf="bulkActionDrawerOpen" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 24px;">
            <div style="background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 12px; width: 400px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
              <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--crm-text-1); margin: 0 0 16px;">{{ bulkActionTitle }}</h3>
              
              <div *ngIf="bulkActionType === 'edit'" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">Select Field</label>
                  <select [(ngModel)]="bulkEditField" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;">
                    <option value="">-- Choose Field --</option>
                    <option *ngFor="let opt of getBulkEditFields()" [value]="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">New Value</label>
                  <input type="text" [(ngModel)]="bulkEditValue" placeholder="Enter new value..." style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;" />
                </div>
              </div>

              <div *ngIf="bulkActionType === 'assign'" style="margin-bottom: 20px;">
                <label style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">Select New Owner</label>
                <select [(ngModel)]="bulkAssignOwner" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;">
                  <option value="">-- Select Owner --</option>
                  <option *ngFor="let u of salesUsers" [value]="u.username">{{ u.fullName }} ({{ u.username }})</option>
                </select>
              </div>

              <div *ngIf="bulkActionType === 'status'" style="margin-bottom: 20px;">
                <label style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 4px;">Select Status / Stage</label>
                <select [(ngModel)]="bulkStatusValue" style="width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; background: var(--crm-bg); color: var(--crm-text-1); outline: none;">
                  <option value="">-- Select Status --</option>
                  <option *ngFor="let st of getBulkStatuses()" [value]="st.value">{{ st.label }}</option>
                </select>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button (click)="bulkActionDrawerOpen = false" style="padding: 6px 14px; background: none; border: 1px solid var(--crm-border); border-radius: 8px; font-size: 0.8rem; font-weight: 600; color: var(--crm-text-2); cursor: pointer;">Cancel</button>
                <button (click)="submitBulkAction()" style="padding: 6px 16px; background: var(--crm-primary); border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 600; color: #fff; cursor: pointer;">Save Changes</button>
              </div>
            </div>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .lp-container { display: flex; flex-direction: column; height: 100%; }
    .lp-workspace-wrapper { padding: 24px 28px; flex: 1; display: flex; flex-direction: column; background: var(--crm-bg); }
    .lp-toolbar { padding: 12px 24px; background: var(--crm-card); border-bottom: 1px solid var(--crm-border); display: flex; justify-content: flex-end; }
    .lp-view-toggle { display: flex; background: var(--crm-hover); padding: 4px; border-radius: 8px; }
    .lp-toggle-btn { padding: 6px 14px; font-size: 0.8rem; font-weight: 600; color: var(--crm-text-3); background: transparent; border: none; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; }
    .lp-toggle-btn:hover { color: var(--crm-text-1); }
    .lp-toggle-btn.active { background: var(--crm-card); color: var(--crm-text-1); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .lp-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 24px; color: var(--crm-text-4); font-size: 0.85rem; }
    .lp-spinner { width: 36px; height: 36px; border: 3px solid var(--crm-border); border-top-color: var(--crm-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .lp-error { display: flex; align-items: center; gap: 10px; margin: 24px; padding: 14px 18px; background: var(--crm-danger-soft); color: var(--crm-danger); border-radius: 8px; font-size: 0.85rem; font-weight: 500; }

    /* Calendar styles */
    .cal-container { padding: 40px 28px; display: flex; flex-direction: column; gap: 24px; background: var(--crm-bg); min-height: calc(100vh - 80px); }
    .cal-title { font-size: 1.4rem; font-weight: 700; color: var(--crm-text-1); margin: 0; }
    .cal-subtitle { color: var(--crm-text-3); font-size: 0.85rem; margin: 6px 0 0; }
    .cal-card { background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 18px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
    .cal-loading { text-align: center; padding: 40px; color: var(--crm-text-3); font-size: 0.9rem; }
    .cal-details { background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 18px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
    .cal-details-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; }
    .cal-details-left { display: flex; flex-direction: column; }
    .cal-details-right { display: flex; flex-direction: column; border-left: 1px dashed var(--crm-border); padding-left: 40px; }
    .details-title { font-size: 1rem; font-weight: 600; color: var(--crm-text-2); margin: 0 0 16px; }
    .details-list { display: flex; flex-direction: column; gap: 10px; }
    .details-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--crm-border); background: var(--crm-bg); }
    .details-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; }
    .details-item[data-status="COMPLETED"] .details-badge { background: var(--crm-success-soft); color: var(--crm-success); }
    .details-item[data-status="PENDING"] .details-badge { background: var(--crm-warning-soft); color: #92400E; }
    .details-item[data-status="IN_PROGRESS"] .details-badge { background: var(--crm-primary-soft); color: var(--crm-primary); }
    .details-label { font-size: 0.85rem; color: var(--crm-text-2); font-weight: 500; }
    .details-empty { font-size: 0.82rem; color: var(--crm-text-4); margin: 0; }

    /* Reports & Analytics styles */
    .rep-container, .an-container { padding: 40px 28px; display: flex; flex-direction: column; gap: 24px; background: var(--crm-bg); min-height: calc(100vh - 80px); }
    .rep-title, .an-title { font-size: 1.4rem; font-weight: 700; color: var(--crm-text-1); margin: 0; }
    .rep-subtitle, .an-subtitle { color: var(--crm-text-3); font-size: 0.85rem; margin: 6px 0 0; }
    .rep-loading, .an-loading { text-align: center; padding: 60px; color: var(--crm-text-3); font-size: 0.9rem; }
    .rep-grid, .an-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .rep-card, .an-card { background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 18px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
    .an-card { display: flex; flex-direction: column; height: 380px; }
    .scroll-card { overflow: hidden; }
    .rep-summary { grid-column: span 2; }
    .card-title { font-size: 1rem; font-weight: 600; color: var(--crm-text-2); margin: 0 0 20px; }
    .kpi-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .kpi-box { border: 1px solid var(--crm-border); border-radius: 12px; padding: 18px; background: var(--crm-bg); text-align: center; }
    .kpi-label { display: block; font-size: 0.78rem; color: var(--crm-text-3); font-weight: 500; margin-bottom: 6px; }
    .kpi-value { font-size: 1.5rem; font-weight: 700; color: var(--crm-text-1); }
    .bar-chart { display: flex; flex-direction: column; gap: 16px; }
    .bar-row { display: flex; align-items: center; gap: 14px; }
    .bar-label { width: 100px; font-size: 0.8rem; color: var(--crm-text-2); font-weight: 500; }
    .bar-fill-container { flex: 1; height: 10px; background: var(--crm-hover); border-radius: 5px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 5px; transition: width 0.8s ease-in-out; }
    .bar-value { font-size: 0.82rem; font-weight: 600; color: var(--crm-text-2); width: 100px; text-align: right; }
    .funnel-chart { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 10px; }
    .funnel-stage { height: 38px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 0.82rem; font-weight: 600; transition: width 0.8s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .delivery-bar { margin-bottom: 20px; }
    .d-info { display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 8px; }
    .d-val { color: var(--crm-text-1); }
    .d-track { height: 8px; background: var(--crm-hover); border-radius: 4px; overflow: hidden; }
    .d-fill { height: 100%; border-radius: 4px; }
    .c-list { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; padding-right: 4px; }
    .c-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--crm-border); border-radius: 10px; background: var(--crm-bg); }
    .c-name-col { display: flex; flex-direction: column; gap: 4px; }
    .c-name { font-size: 0.85rem; font-weight: 600; color: var(--crm-text-1); }
    .c-subj { font-size: 0.75rem; color: var(--crm-text-3); }
    .c-metrics-col { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .c-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; }
    .c-badge[data-status="RUNNING"] { background: var(--crm-primary-soft); color: var(--crm-primary); }
    .c-badge[data-status="DRAFT"] { background: var(--crm-hover); color: var(--crm-text-2); }
    .c-badge[data-status="COMPLETED"] { background: var(--crm-success-soft); color: var(--crm-success); }
    .c-date { font-size: 0.7rem; color: var(--crm-text-4); }
    .an-empty { text-align: center; color: var(--crm-text-4); font-size: 0.8rem; padding: 40px 0; }

    /* Settings styles */
    .set-container { padding: 40px 28px; display: flex; flex-direction: column; gap: 24px; background: var(--crm-bg); min-height: calc(100vh - 80px); }
    .set-title { font-size: 1.4rem; font-weight: 700; color: var(--crm-text-1); margin: 0; }
    .set-subtitle { color: var(--crm-text-3); font-size: 0.85rem; margin: 6px 0 0; }
    .set-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .set-card { background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 18px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
    .profile-summary { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .prof-avatar { width: 48px; height: 48px; background: var(--crm-primary); color: #FFFFFF; font-size: 1.25rem; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .prof-info { display: flex; flex-direction: column; gap: 4px; }
    .prof-name { font-size: 0.95rem; font-weight: 600; color: var(--crm-text-1); }
    .prof-role { font-size: 0.78rem; color: var(--crm-text-3); }
    .form-group { margin-bottom: 18px; }
    .form-label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--crm-text-2); margin-bottom: 6px; }
    .form-input { width: 100%; border: 1px solid var(--crm-border); border-radius: 8px; padding: 10px 14px; font-size: 0.85rem; color: var(--crm-text-1); background: var(--crm-bg); outline: none; }
    .form-input:disabled { color: var(--crm-text-3); cursor: not-allowed; }
    .read-only-field { background: var(--crm-hover); border-color: var(--crm-border); color: var(--crm-text-2); cursor: default; }
    .license-note { font-size: 0.78rem; color: var(--crm-text-4); line-height: 1.4; margin: 0 0 20px; }
    .license-loading { font-size: 0.82rem; color: var(--crm-text-4); text-align: center; padding: 20px 0; }

    /* Emails styles */
    .em-container { padding: 40px 28px; display: flex; flex-direction: column; gap: 24px; background: var(--crm-bg); min-height: calc(100vh - 80px); }
    .em-title { font-size: 1.4rem; font-weight: 700; color: var(--crm-text-1); margin: 0; }
    .em-subtitle { color: var(--crm-text-3); font-size: 0.85rem; margin: 6px 0 0; }
    .em-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; height: 500px; }
    .em-card { background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); display: flex; flex-direction: column; overflow: hidden; }
    .em-list-card { max-height: 100%; }
    .em-list-header { padding: 20px; border-bottom: 1px solid var(--crm-border); display: flex; justify-content: space-between; align-items: center; }
    .em-list-container { overflow-y: auto; flex: 1; }
    .em-item { padding: 16px 20px; border-bottom: 1px solid var(--crm-border); cursor: pointer; transition: background 0.15s ease; }
    .em-item:hover { background: var(--crm-hover); }
    .em-item.selected { background: var(--crm-primary-soft); border-left: 4px solid var(--crm-primary); padding-left: 16px; }
    .em-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .em-from { font-size: 0.85rem; font-weight: 600; color: var(--crm-text-1); }
    .em-date { font-size: 0.72rem; color: var(--crm-text-4); }
    .em-subj { font-size: 0.8rem; font-weight: 500; color: var(--crm-text-2); display: block; margin-bottom: 4px; }
    .em-snippet { font-size: 0.76rem; color: var(--crm-text-3); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .em-detail-card { padding: 24px; overflow-y: auto; }
    .em-detail-header { border-bottom: 1px solid var(--crm-border); padding-bottom: 20px; margin-bottom: 20px; }
    .em-detail-subject { font-size: 1.15rem; font-weight: 700; color: var(--crm-text-1); margin: 0 0 16px; }
    .em-detail-meta { display: flex; justify-content: space-between; align-items: center; }
    .em-sender-row { display: flex; align-items: center; gap: 10px; }
    .em-sender-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--crm-primary); color: #FFFFFF; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .em-sender-info { display: flex; flex-direction: column; }
    .em-detail-from { font-size: 0.85rem; font-weight: 600; color: var(--crm-text-2); }
    .em-detail-to { font-size: 0.72rem; color: var(--crm-text-4); }
    .em-detail-date { font-size: 0.75rem; color: var(--crm-text-3); }
    .em-detail-body { font-size: 0.88rem; color: var(--crm-text-2); line-height: 1.6; white-space: pre-line; }
    .em-detail-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--crm-text-4); font-size: 0.85rem; }
    .em-btn { padding: 6px 12px; font-size: 0.78rem; font-weight: 600; border-radius: 8px; border: 1px solid var(--crm-border); background: var(--crm-card); color: var(--crm-text-2); cursor: pointer; transition: all 0.15s ease; }
    .em-btn-primary { background: var(--crm-primary); color: #FFFFFF; border: none; }
    .em-btn-primary:hover { background: var(--crm-primary-dark); }
    .em-empty { text-align: center; color: var(--crm-text-4); font-size: 0.8rem; padding: 40px 0; }

    /* Custom Table Styles for Quotes & Invoices */
    .custom-table-container { width: 100%; overflow-x: auto; background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
    .custom-data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
    .custom-data-table th, .custom-data-table td { padding: 12px 16px; border-bottom: 1px solid var(--crm-border); color: var(--crm-text-2); }
    .custom-data-table th { background: var(--crm-hover); font-weight: 600; color: var(--crm-text-1); }
    .custom-data-table tr:hover td { background: var(--crm-hover); }
    .custom-data-table tr.selected td { background: var(--crm-primary-soft); }
    .chk-col { width: 40px; text-align: center; }
    .row-chk { width: 16px; height: 16px; accent-color: var(--crm-primary); cursor: pointer; }
    .actions-col { width: 100px; text-align: center; }
    .row-action-btn { padding: 4px 10px; font-size: 0.75rem; font-weight: 600; border-radius: 6px; border: 1px solid var(--crm-border); background: var(--crm-card); color: var(--crm-primary); cursor: pointer; transition: all 0.15s; }
    .row-action-btn:hover { background: var(--crm-primary); color: #fff; border-color: var(--crm-primary); }
    .empty-row { text-align: center; color: var(--crm-text-4); padding: 32px 0; }
    .th-filter-btn { background: none; border: none; padding: 4px; color: var(--crm-text-3); cursor: pointer; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.12s; }
    .th-filter-btn:hover { background: rgba(0,0,0,0.06); color: var(--crm-text-1); }
    .th-filter-btn.active { color: var(--crm-primary) !important; background: var(--crm-primary-soft) !important; }
    .th-filter-popup { position: absolute; top: 100%; right: 0; margin-top: 8px; width: 220px; background: var(--crm-card); border: 1px solid var(--crm-border); border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); padding: 12px; z-index: 50; text-align: left; white-space: normal; display: flex; flex-direction: column; gap: 8px; }
    
    .status-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; }
    .status-badge[data-status="Draft"] { background: var(--crm-hover); color: var(--crm-text-3); }
    .status-badge[data-status="Sent"] { background: var(--crm-primary-soft); color: var(--crm-primary); }
    .status-badge[data-status="Accepted"] { background: var(--crm-success-soft); color: var(--crm-success); }
    .status-badge[data-status="Paid"] { background: var(--crm-success-soft); color: var(--crm-success); }
    .status-badge[data-status="Rejected"] { background: var(--crm-danger-soft); color: var(--crm-danger); }
    
    /* PDF Floating Bottom Bar */
    .pdf-floating-bar { position: fixed; bottom: 0; right: 0; height: 64px; background: var(--crm-card); border-top: 1px solid var(--crm-border); box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08); z-index: 1000; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; transition: left 0.2s ease; }
    .pdf-bar-left { display: flex; align-items: center; gap: 16px; }
    .pdf-bar-close-btn { padding: 6px 14px; background: none; border: 1px solid var(--crm-border); border-radius: 8px; font-size: 0.8rem; font-weight: 600; color: var(--crm-text-2); cursor: pointer; transition: all 0.15s; }
    .pdf-bar-close-btn:hover { background: var(--crm-hover); color: var(--crm-text-1); }
    .pdf-bar-row-info { font-size: 0.85rem; color: var(--crm-text-1); }
    .pdf-bar-right { display: flex; align-items: center; gap: 12px; }
    .pdf-bar-action-btn { padding: 8px 18px; font-size: 0.8rem; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; transition: all 0.15s; }
    .pdf-btn-primary { background: var(--crm-primary); color: #fff; }
    .pdf-btn-primary:hover:not(:disabled) { background: var(--crm-primary-dark); }
    .pdf-btn-secondary { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; }
    .pdf-btn-secondary:hover:not(:disabled) { background: #059669; color: #fff; }
    .pdf-bar-action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListPageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() resource = '';

  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  selectedRow: any = null;
  pdfDownloading = false;
  private readonly http = inject(HttpClient);
  base = `http://${globalThis.location?.hostname || 'localhost'}:8085`;

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

  // Calendar Scheduler / Sync states
  calendarSubMode: 'calendar' | 'scheduler' = 'calendar';
  schedulerDate = '';
  schedulerDuration = 30;
  schedulerSlots: any[] = [];
  selectedSlot: any = null;
  slotBookingTitle = '';
  loadingSlots = false;

  columnFilters: Record<string, string> = {};
  tempFilters: Record<string, string> = {};
  activeFilterField: string | null = null;

  page: PageConfig | null = null;
  data: any[] = [];
  loading = false;
  error: string | null = null;
  viewMode: 'table' | 'kanban' = 'table';

  // Custom resource states
  loadingCustom = false;
  calendarCurrentDate = new Date();
  calendarDays: CalendarDay[] = [];
  selectedCalendarDay: CalendarDay | null = null;
  reportsPipelineData: any[] = [];
  analyticsCampaigns: any[] = [];
  settingsLicenseInfo: any = null;
  selectedEmail: any = null;

  emails = [
    {
      id: 1,
      sender: 'Google Workspace Team',
      subject: 'Welcome to Orque Workspace!',
      date: new Date(),
      snippet: 'Welcome to your new enterprise workspace inbox. Get started by setting up...',
      body: `Hello System Admin,

      Welcome to your new enterprise workspace inbox. Get started by setting up your team profiles, security configurations, and custom integrations.

      If you have any questions, feel free to contact corporate support.

      Regards,
      Google Workspace Team`
    },
    {
      id: 2,
      sender: 'Alice Vance (Acme Corp)',
      subject: 'Re: Quotation Proposal Request',
      date: new Date(Date.now() - 3600000),
      snippet: 'Hi, we reviewed the quotation you sent yesterday. The pricing looks aligned with...',
      body: `Hi Admin,

      We reviewed the quotation you sent yesterday. The pricing looks aligned with our Q3 budgets. We will schedule a team follow-up call tomorrow at 10 AM to finalize the terms.

      Please send across the MSA draft if ready.

      Best regards,
      Alice Vance
      Acme Corp`
    },
    {
      id: 3,
      sender: 'Rob Stark (Winterfell LLC)',
      subject: 'Inquiry: Enterprise License Grace Period',
      date: new Date(Date.now() - 7200000),
      snippet: 'Hello, could you clarify what happens to our data access when the grace period...',
      body: `Hello,

      Could you clarify what happens to our data access when the grace period expires? We are working with procurement to sign the contract extension, but might need a few extra days.

      Thanks,
      Rob Stark
      Winterfell LLC`
    }
  ];

  private _loadedResource: string | null = null;
  private _subs = new Subscription();

  private readonly store = inject(PageStoreService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(OToastService);

  constructor() {}

  ngOnInit(): void {
    const routeResource = this.route.snapshot.data['resource'];
    if (routeResource) {
      this.resource = routeResource;
    }
    if (this.resource && this._loadedResource !== this.resource) {
      this._loadedResource = this.resource;
      this.viewMode = 'table';
      this.loadPage();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resource'] && this.resource && this._loadedResource !== this.resource) {
      this._loadedResource = this.resource;
      this.viewMode = 'table';
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
    return ['calendar', 'reports', 'analytics', 'settings', 'emails'].includes(this.resource);
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

    if (this.isCustomResource()) {
      this.loadCustomResource();
      return;
    }

    const sub = this.store.getPageConfig(this.resource).subscribe({
      next: (config: PageConfig) => {
        this.page = config;
        this.cdr.markForCheck();
        this.loadData(config.api);
      },
      error: (err) => {
        this.error = `Failed to load page: ${err.message}`;
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

  // Loaders for custom consolidated views
  private loadCustomResource(): void {
    this.loadingCustom = true;
    this.cdr.markForCheck();

    if (this.resource === 'calendar') {
      forkJoin({
        tasks: this.store.getList('/api/v1/tasks').pipe(catchError(() => of([]))),
        acts:  this.store.getList('/api/v1/activities').pipe(catchError(() => of([])))
      }).subscribe({
        next: ({ tasks, acts }) => {
          const actItems = acts.map((a: any) => ({
            title: a.subject || a.type || 'Activity',
            dueDate: a.dueDate,
            status: a.status || 'Pending',
            relatedType: a.relatedType || 'Activity'
          }));
          this.buildCalendar([...tasks, ...actItems]);
          this.loadingCustom = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.buildCalendar([]);
          this.loadingCustom = false;
          this.cdr.markForCheck();
        }
      });
    } else if (this.resource === 'reports') {
      this.store.getList('/api/v1/deals').subscribe({
        next: (deals) => {
          const stages = [
            { label: 'Prospecting', value: 0, percentage: 0, color: '#9CA3AF' },
            { label: 'Qualification', value: 0, percentage: 0, color: '#3B82F6' },
            { label: 'Proposal', value: 0, percentage: 0, color: '#F59E0B' },
            { label: 'Negotiation', value: 0, percentage: 0, color: '#F97316' },
            { label: 'Closed Won', value: 0, percentage: 0, color: '#10B981' }
          ];
          let maxAmount = 1;
          deals.forEach(deal => {
            const st = stages.find(s => deal.stage?.toLowerCase() === s.label.toLowerCase());
            if (st) st.value += deal.amount || 0;
          });
          stages.forEach(s => { if (s.value > maxAmount) maxAmount = s.value; });
          stages.forEach(s => { s.percentage = Math.max(10, Math.round((s.value / maxAmount) * 100)); });
          this.reportsPipelineData = stages;
          this.loadingCustom = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.reportsPipelineData = [
            { label: 'Prospecting', value: 120000, percentage: 30, color: '#9CA3AF' },
            { label: 'Qualification', value: 250000, percentage: 60, color: '#3B82F6' },
            { label: 'Proposal', value: 450000, percentage: 100, color: '#F59E0B' },
            { label: 'Negotiation', value: 180000, percentage: 40, color: '#F97316' },
            { label: 'Closed Won', value: 340000, percentage: 80, color: '#10B981' }
          ];
          this.loadingCustom = false;
          this.cdr.markForCheck();
        }
      });
    } else if (this.resource === 'analytics') {
      this.store.getList('/api/v1/campaigns').subscribe({
        next: (data) => {
          this.analyticsCampaigns = data ?? [];
          this.loadingCustom = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.analyticsCampaigns = [];
          this.loadingCustom = false;
          this.cdr.markForCheck();
        }
      });
    } else if (this.resource === 'settings') {
      this.store.getList('/api/v1/settings/license').subscribe({
        next: (res: any) => {
          this.settingsLicenseInfo = res;
          this.loadingCustom = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.settingsLicenseInfo = { startDate: '2026-01-01', endDate: '2026-12-31', gracePeriod: '30 days' };
          this.loadingCustom = false;
          this.cdr.markForCheck();
        }
      });
    } else if (this.resource === 'emails') {
      this.selectedEmail = this.emails[0];
      this.loadingCustom = false;
      this.cdr.markForCheck();
    }
  }

  // Calendar logic
  buildCalendar(tasks: any[]): void {
    const baseDate = this.calendarCurrentDate;
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const gridDays: CalendarDay[] = [];

    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLast - i);
      gridDays.push({ date: d, isCurrentMonth: false, events: this.getCalendarEvents(d, tasks) });
    }
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      gridDays.push({ date: d, isCurrentMonth: true, events: this.getCalendarEvents(d, tasks) });
    }
    const cells = gridDays.length <= 35 ? 35 : 42;
    const nextOffset = cells - gridDays.length;
    for (let i = 1; i <= nextOffset; i++) {
      const d = new Date(year, month + 1, i);
      gridDays.push({ date: d, isCurrentMonth: false, events: this.getCalendarEvents(d, tasks) });
    }
    this.calendarDays = gridDays;
    if (!this.selectedCalendarDay) {
      const today = new Date();
      this.selectedCalendarDay = this.calendarDays.find(day => 
        day.date.getDate() === today.getDate() && day.date.getMonth() === today.getMonth() && day.date.getFullYear() === today.getFullYear()
      ) || null;
    }
  }

  getCalendarEvents(d: Date, tasks: any[]): CalendarDayEvent[] {
    return tasks
      .filter(t => {
        if (!t.dueDate) return false;
        const td = new Date(t.dueDate);
        return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      })
      .map(t => ({ label: t.title, status: t.status || 'PENDING' }));
  }

  onCalendarMonthChange(newDate: Date): void {
    this.calendarCurrentDate = newDate;
    this.selectedCalendarDay = null;
    this.loadCustomResource();
  }

  onCalendarDayClick(day: CalendarDay): void {
    this.selectedCalendarDay = day;
  }

  newEventTitle = '';
  newEventDesc = '';
  newEventAssign = 'Admin';

  createCalendarEvent(): void {
    if (!this.newEventTitle.trim() || !this.selectedCalendarDay) {
      this.toast.addWarning('Validation', 'Event Title is required.');
      return;
    }

    const year = this.selectedCalendarDay.date.getFullYear();
    const month = String(this.selectedCalendarDay.date.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedCalendarDay.date.getDate()).padStart(2, '0');
    const dueDateStr = `${year}-${month}-${day}`;

    const newTask = {
      title: this.newEventTitle,
      description: this.newEventDesc,
      dueDate: dueDateStr,
      assignedTo: this.newEventAssign,
      status: 'PENDING',
      priority: 'MEDIUM'
    };

    this.store.post('/api/v1/tasks', newTask).subscribe({
      next: () => {
        this.toast.addSuccess('Success', 'Event created successfully.');
        this.newEventTitle = '';
        this.newEventDesc = '';
        this.loadCustomResource();
      },
      error: () => {
        this.toast.addError('Error', 'Failed to create event.');
      }
    });
  }

  // Email logic
  selectEmail(m: any): void {
    this.selectedEmail = m;
  }

  composeEmail(): void {
    this.toast.addInfo('Compose', 'Outbound corporate composer draft initiated.');
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
        break;

      case 'navigate': {
        if (uuid) this.router.navigate(['/', this.resource, uuid]);
        break;
      }

      case 'save': {
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
        if (!confirm('Terminate all other active sessions?')) return;
        const sub = this.store.delete(`${base}/terminate-all`).subscribe({
          next: () => {
            this.toast.addSuccess('Done', 'All other sessions terminated.');
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Terminate all failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'reset-password': {
        const newPwd = prompt(`Set new password for ${label}:`);
        if (!newPwd) return;
        const sub = this.store.post(`${base}/${uuid}/reset-password`, { newPassword: newPwd }).subscribe({
          next: () => this.toast.addSuccess('Password Reset', `Password updated for ${label}.`),
          error: (err) => this.showError(`Reset failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
        break;
      }

      case 'activate':
      case 'deactivate': {
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
        if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
        const sub = this.store.delete(`${base}/${uuid}`).subscribe({
          next: () => {
            this.toast.addSuccess('Deleted', `${label} deleted.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Delete failed: ${err?.error?.message || err.message}`)
        });
        this._subs.add(sub);
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

    const base = `http://${globalThis.location.hostname}:8085`;

    this._subs.add(
      this.http.get(`${base}/api/v1/${type}/${rowId}/pdf`, {
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
    if (!this.selectedRow || this.pdfDownloading) return;
    
    if (this.selectedRow.status !== 'Accepted') {
      this.toast.addError('Error', 'Invoice can only be generated from an Accepted quote.');
      return;
    }

    const quoteId = this.selectedRow.id;
    this.pdfDownloading = true;
    this.cdr.markForCheck();

    const base = `http://${globalThis.location.hostname}:8085`;

    this._subs.add(
      this.http.post<any>(`${base}/api/v1/quotes/${quoteId}/invoice`, {}, {
        headers: this.hdrs()
      }).subscribe({
        next: (invoice) => {
          this.toast.addSuccess('Success', `Invoice ${invoice.invoiceNumber} generated successfully!`);
          this.pdfDownloading = false;
          
          this.selectedRow = null;
          this.loadPage();

          const filename = invoice.invoiceNumber || `invoice-${invoice.id}`;
          this.http.get(`${base}/api/v1/invoices/${invoice.id}/pdf`, {
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

  get filteredTableData(): any[] {
    let rows = [...(this.data || [])];
    
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
    this.cdr.detectChanges();
  }

  clearBulkSelection() {
    this.selectedBulkRows = [];
    this.cdr.detectChanges();
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
      return [
        { label: 'New', value: 'NEW' },
        { label: 'Contacted', value: 'CONTACTED' },
        { label: 'Qualified', value: 'QUALIFIED' },
        { label: 'Unqualified', value: 'UNQUALIFIED' }
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
        { label: 'Active', value: 'Active' },
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
    const token = localStorage.getItem('accessToken') ?? '';
    const hdrs = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any[]>(`${this.base}/api/v1/users/sales`, { headers: hdrs })
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
    if (!confirm(`Are you sure you want to delete these ${this.selectedBulkRows.length} records?`)) return;
    const token = localStorage.getItem('accessToken') ?? '';
    const hdrs = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const ids = this.selectedBulkRows.map(r => r.id);
    this.http.post<any>(`${this.base}/api/v1/bulk/delete?module=${this.resource}`, ids, { headers: hdrs })
      .subscribe({
        next: () => {
          alert('Bulk delete completed.');
          this.selectedBulkRows = [];
          if (this.page) {
            this.loadData(this.page.api);
          }
          this.cdr.detectChanges();
        },
        error: err => alert(err?.error?.message || 'Bulk delete failed.')
      });
  }

  submitBulkAction() {
    const token = localStorage.getItem('accessToken') ?? '';
    const hdrs = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const ids = this.selectedBulkRows.map(r => r.id);

    let url = `${this.base}/api/v1/bulk/`;
    if (this.bulkActionType === 'edit') {
      if (!this.bulkEditField) return alert('Choose field.');
      url += `edit?module=${this.resource}&fieldName=${this.bulkEditField}&fieldValue=${encodeURIComponent(this.bulkEditValue)}`;
    } else if (this.bulkActionType === 'assign') {
      if (!this.bulkAssignOwner) return alert('Choose owner.');
      url += `assign?module=${this.resource}&owner=${this.bulkAssignOwner}`;
    } else if (this.bulkActionType === 'status') {
      if (!this.bulkStatusValue) return alert('Choose status.');
      url += `status?module=${this.resource}&status=${this.bulkStatusValue}`;
    } else {
      return;
    }

    this.http.post<any>(url, ids, { headers: hdrs }).subscribe({
      next: () => {
        alert('Bulk operation completed successfully.');
        this.bulkActionDrawerOpen = false;
        this.selectedBulkRows = [];
        if (this.page) {
          this.loadData(this.page.api);
        }
        this.cdr.detectChanges();
      },
      error: err => alert(err?.error?.message || 'Bulk action failed.')
    });
  }

  syncCalendarProvider(provider: 'google' | 'outlook') {
    const token = localStorage.getItem('accessToken') ?? '';
    const hdrs = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const url = `${this.base.replace('/emails', '/calendar-events')}/sync/${provider}`;
    this.http.post<any>(url, {}, { headers: hdrs })
      .subscribe({
        next: (res) => {
          alert(`Successfully synced ${res.syncedCount} events from ${res.provider}!`);
          this.loadCustomResource();
        },
        error: () => alert(`Failed to sync calendar with ${provider}.`)
      });
  }

  loadAvailableSlots() {
    if (!this.schedulerDate) return;
    this.loadingSlots = true;
    this.selectedSlot = null;
    this.cdr.detectChanges();

    const token = localStorage.getItem('accessToken') ?? '';
    const hdrs = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const url = `${this.base.replace('/emails', '/calendar-events')}/slots?date=${this.schedulerDate}&durationMinutes=${this.schedulerDuration}`;
    
    this.http.get<any[]>(url, { headers: hdrs })
      .subscribe({
        next: (slots) => {
          this.schedulerSlots = slots;
          this.loadingSlots = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.schedulerSlots = [];
          this.loadingSlots = false;
          this.cdr.detectChanges();
        }
      });
  }

  selectSlotToBook(slot: any) {
    this.selectedSlot = slot;
    this.slotBookingTitle = '';
    this.cdr.detectChanges();
  }

  bookMeetingSlot() {
    if (!this.slotBookingTitle) return alert('Enter title.');
    
    const token = localStorage.getItem('accessToken') ?? '';
    const hdrs = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    const startStr = `${this.schedulerDate}T${this.selectedSlot.time}`;
    const startDt = new Date(startStr);
    const endDt = new Date(startDt.getTime() + this.schedulerDuration * 60 * 1000);
    
    const offset = startDt.getTimezoneOffset();
    const localStart = new Date(startDt.getTime() - offset * 60000).toISOString().slice(0, 19);
    const localEnd = new Date(endDt.getTime() - offset * 60000).toISOString().slice(0, 19);

    const payload = {
      title: this.slotBookingTitle,
      description: `Booked via Meeting Scheduler Slot Booker`,
      startDateTime: localStart,
      endDateTime: localEnd,
      timeZone: 'Asia/Kolkata',
      colorCategory: '#10B981'
    };

    this.http.post<any>(`${this.base.replace('/emails', '/calendar-events')}`, payload, { headers: hdrs })
      .subscribe({
        next: () => {
          alert('Meeting booked successfully!');
          this.selectedSlot = null;
          this.slotBookingTitle = '';
          this.loadAvailableSlots();
          this.loadCustomResource();
        },
        error: () => alert('Failed to book meeting slot.')
      });
  }
}
