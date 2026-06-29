import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface EmailMessage {
  id?: number;
  subject: string;
  body: string;
  sender: string;
  recipient: string;
  folder: string;
  isStarred: boolean;
  isRead: boolean;
  openCount?: number;
  clickCount?: number;
  createdAt?: string;
}

@Component({
  selector: 'app-email-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './email-workspace.html',
  styleUrls: ['./email-workspace.scss']
})
export class EmailWorkspaceComponent implements OnInit {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/v1/emails';

  folders = ['inbox', 'sent', 'drafts', 'starred', 'trash'];
  activeFolder = signal('inbox');
  emails = signal<EmailMessage[]>([]);
  selectedEmail = signal<EmailMessage | null>(null);
  showCompose = signal(false);
  loading = signal(false);
  search = signal('');
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  compose = {
    subject: '', body: '', recipient: ''
  };

  folderIcons: Record<string, string> = {
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2',
    sent: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    drafts: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7',
    starred: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    trash: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2'
  };

  folderCounts: Record<string, number> = {};

  ngOnInit() {
    this.loadFolder('inbox');
    this.loadFolderCounts();
  }

  loadFolder(folder: string) {
    this.activeFolder.set(folder);
    this.selectedEmail.set(null);
    this.loading.set(true);

    const endpoint = folder === 'starred'
      ? `${this.base}/folder/inbox`
      : `${this.base}/folder/${folder}`;

    this.http.get<EmailMessage[]>(endpoint)
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        let filtered = data;
        if (folder === 'starred') filtered = data.filter(e => e.isStarred);
        this.emails.set(filtered);
        this.loading.set(false);
      });
  }

  loadFolderCounts() {
    for (const f of ['inbox', 'sent', 'drafts', 'trash']) {
      this.http.get<EmailMessage[]>(`${this.base}/folder/${f}`)
        .pipe(catchError(() => of([])))
        .subscribe(data => this.folderCounts[f] = data.filter(e => !e.isRead).length);
    }
  }

  selectEmail(email: EmailMessage) {
    this.selectedEmail.set(email);
    if (!email.isRead && email.id) {
      email.isRead = true;
    }
  }

  toggleStar(email: EmailMessage, event: Event) {
    event.stopPropagation();
    if (!email.id) return;
    this.http.post(`${this.base}/${email.id}/star`, {})
      .subscribe(() => {
        email.isStarred = !email.isStarred;
        this.emails.update(list => [...list]);
      });
  }

  sendEmail() {
    if (!this.compose.subject || !this.compose.recipient) return;
    const email = {
      subject: this.compose.subject,
      body: this.compose.body,
      recipient: this.compose.recipient,
      folder: 'sent',
      isStarred: false,
      isRead: true
    };
    this.http.post<EmailMessage>(`${this.base}/send`, email)
      .subscribe({
        next: () => {
          this.showCompose.set(false);
          this.compose = { subject: '', body: '', recipient: '' };
          this.showToast('Email sent!', 'success');
          if (this.activeFolder() === 'sent') this.loadFolder('sent');
        },
        error: () => this.showToast('Failed to send email', 'error')
      });
  }

  deleteEmail(email: EmailMessage) {
    if (!email.id) return;
    this.http.delete(`${this.base}/${email.id}`)
      .subscribe({
        next: () => {
          this.emails.update(list => list.filter(e => e.id !== email.id));
          if (this.selectedEmail()?.id === email.id) this.selectedEmail.set(null);
          this.showToast('Deleted', 'success');
        }
      });
  }

  getFilteredEmails(): EmailMessage[] {
    const s = this.search().toLowerCase();
    if (!s) return this.emails();
    return this.emails().filter(e =>
      e.subject?.toLowerCase().includes(s) ||
      e.sender?.toLowerCase().includes(s) ||
      e.recipient?.toLowerCase().includes(s)
    );
  }

  getFolderLabel(folder: string): string {
    return folder.charAt(0).toUpperCase() + folder.slice(1);
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
