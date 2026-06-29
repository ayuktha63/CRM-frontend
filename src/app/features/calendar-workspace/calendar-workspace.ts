import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface CrmCalendarEvent {
  id?: number;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  recurrenceRule: string;
  colorCategory: string;
  meetingRoom: string;
  invitees: string;
  reminderMinutes: number;
  createdBy?: string;
}

@Component({
  selector: 'app-calendar-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './calendar-workspace.html',
  styleUrls: ['./calendar-workspace.scss']
})
export class CalendarWorkspaceComponent implements OnInit {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/v1/calendar-events';

  viewMode = signal<'month' | 'week' | 'day'>('month');
  currentDate = signal(new Date());
  events = signal<CrmCalendarEvent[]>([]);
  showEventForm = signal(false);
  selectedEvent = signal<CrmCalendarEvent | null>(null);
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  newEvent: CrmCalendarEvent = {
    title: '', description: '', startDateTime: '', endDateTime: '',
    recurrenceRule: 'NONE', colorCategory: '#6366F1', meetingRoom: '',
    invitees: '', reminderMinutes: 15
  };

  recurrenceOptions = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'];
  colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'];
  
  // Calendar grid
  calendarDays = computed(() => this.buildMonthGrid(this.currentDate()));
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  monthLabel = computed(() => {
    const d = this.currentDate();
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  });

  ngOnInit() { this.loadEvents(); }

  loadEvents() {
    this.http.get<CrmCalendarEvent[]>(this.base)
      .pipe(catchError(() => of([])))
      .subscribe(data => this.events.set(data));
  }

  buildMonthGrid(date: Date): { date: Date; isCurrentMonth: boolean; isToday: boolean }[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const today = new Date();

    // Fill leading days from prev month
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, isToday: false });
    }
    // Fill current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === today.toDateString()
      });
    }
    // Fill trailing days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, isToday: false });
    }
    return days;
  }

  getEventsForDay(date: Date): CrmCalendarEvent[] {
    return this.events().filter(ev => {
      if (!ev.startDateTime) return false;
      const evDate = new Date(ev.startDateTime);
      return evDate.toDateString() === date.toDateString();
    });
  }

  prevMonth() {
    const d = new Date(this.currentDate());
    d.setMonth(d.getMonth() - 1);
    this.currentDate.set(d);
  }

  nextMonth() {
    const d = new Date(this.currentDate());
    d.setMonth(d.getMonth() + 1);
    this.currentDate.set(d);
  }

  today() { this.currentDate.set(new Date()); }

  openCreateEvent(date?: Date) {
    const start = date || new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    this.newEvent = {
      title: '', description: '',
      startDateTime: this.toInputDatetime(start),
      endDateTime: this.toInputDatetime(end),
      recurrenceRule: 'NONE', colorCategory: '#6366F1',
      meetingRoom: '', invitees: '', reminderMinutes: 15
    };
    this.showEventForm.set(true);
  }

  createEvent() {
    if (!this.newEvent.title || !this.newEvent.startDateTime) return;
    this.http.post<CrmCalendarEvent>(this.base, this.newEvent)
      .subscribe({
        next: ev => {
          this.events.update(list => [...list, ev]);
          this.showEventForm.set(false);
          this.showToast('Event created!', 'success');
        },
        error: () => this.showToast('Failed to create event', 'error')
      });
  }

  deleteEvent(id: number | undefined) {
    if (!id) return;
    this.http.delete(`${this.base}/${id}`).subscribe({
      next: () => {
        this.events.update(list => list.filter(e => e.id !== id));
        this.selectedEvent.set(null);
        this.showToast('Event deleted', 'success');
      }
    });
  }

  exportIcs(id: number | undefined) {
    if (!id) return;
    this.http.get(`${this.base}/${id}/export-ics`, { responseType: 'text' }).subscribe(ics => {
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `event_${id}.ics`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  private toInputDatetime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  getEventStyle(ev: CrmCalendarEvent): Record<string, string> {
    return { background: ev.colorCategory || '#6366F1', color: '#fff' };
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
