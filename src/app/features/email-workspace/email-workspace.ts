import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface EmailMessage {
  id?: number;
  subject: string;
  body: string;
  sender: string;
  recipient: string;
  cc?: string;
  bcc?: string;
  folder: string;
  isStarred: boolean;
  isRead: boolean;
  openCount?: number;
  clickCount?: number;
  createdAt?: string;
  gmailThreadId?: string;
  threadMessages?: EmailMessage[];
}

@Component({
  selector: 'app-email-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './email-workspace.html',
  styleUrls: ['./email-workspace.scss']
})
export class EmailWorkspaceComponent implements OnInit, OnDestroy {
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

  // CC/BCC & Scheduling states
  showCc = false;
  showBcc = false;
  scheduledTime = '';
  isScheduled = false;

  // Templates & Signatures
  templates = signal<any[]>([]);
  userSignature = 'Best regards,\nSystem Admin\nOrque CRM Team';
  appendSignature = true;

  compose = {
    subject: '', body: '', recipient: '', cc: '', bcc: ''
  };

  private autosaveInterval: any = null;
  private currentDraftId: number | null = null;

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
    this.loadTemplates();
    this.loadUserSignature();
    this.startAutosaveTimer();
  }

  ngOnDestroy() {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
    }
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadFolder(folder: string) {
    this.activeFolder.set(folder);
    this.selectedEmail.set(null);
    this.loading.set(true);

    const endpoint = folder === 'starred'
      ? `${this.base}/folder/inbox`
      : `${this.base}/folder/${folder}`;

    this.http.get<EmailMessage[]>(endpoint, { headers: this.getHeaders() })
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
      this.http.get<EmailMessage[]>(`${this.base}/folder/${f}`, { headers: this.getHeaders() })
        .pipe(catchError(() => of([])))
        .subscribe(data => this.folderCounts[f] = data.filter(e => !e.isRead).length);
    }
  }

  loadTemplates() {
    this.http.get<any[]>(`${this.base}/templates`, { headers: this.getHeaders() })
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.templates.set(data);
      });
  }

  loadUserSignature() {
    const savedSig = localStorage.getItem('crmEmailSignature');
    if (savedSig) {
      this.userSignature = savedSig;
    }
  }

  saveSignature(sig: string) {
    this.userSignature = sig;
    localStorage.setItem('crmEmailSignature', sig);
    this.showToast('Signature saved', 'success');
  }

  applyTemplate(tpl: any) {
    // Basic mail merge tags substitution
    let bodyText = tpl.bodyHtml || tpl.body || '';
    bodyText = bodyText.replace(/\{contactName\}/g, 'Client');
    bodyText = bodyText.replace(/\{companyName\}/g, 'Your Company');
    
    this.compose.subject = tpl.subject || '';
    this.compose.body = bodyText;
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
    this.http.put(`${this.base}/${email.id}/star`, {}, { headers: this.getHeaders() })
      .subscribe(() => {
        email.isStarred = !email.isStarred;
        this.emails.update(list => [...list]);
      });
  }

  openComposeModal() {
    this.currentDraftId = null;
    this.compose = { subject: '', body: '', recipient: '', cc: '', bcc: '' };
    this.showCc = false;
    this.showBcc = false;
    this.isScheduled = false;
    this.scheduledTime = '';
    this.showCompose.set(true);
  }

  startAutosaveTimer() {
    this.autosaveInterval = setInterval(() => {
      if (this.showCompose() && (this.compose.recipient || this.compose.subject || this.compose.body)) {
        this.autosaveDraft();
      }
    }, 15000);
  }

  autosaveDraft() {
    const mailboxId = 1;
    const bodyWithSig = this.compose.body + (this.appendSignature && this.userSignature ? '\n\n' + this.userSignature : '');
    const emailPayload = {
      mailboxId,
      toEmail: this.compose.recipient,
      cc: this.compose.cc,
      bcc: this.compose.bcc,
      subject: this.compose.subject,
      body: bodyWithSig,
      isDraft: true
    };
    this.http.post<any>(`${this.base}/send`, emailPayload, { headers: this.getHeaders() })
      .subscribe({
        next: () => console.log('Draft autosaved successfully')
      });
  }

  sendEmail() {
    if (!this.compose.subject || !this.compose.recipient) return;
    const bodyWithSig = this.compose.body + (this.appendSignature && this.userSignature ? '\n\n' + this.userSignature : '');
    const emailPayload = {
      mailboxId: 1,
      toEmail: this.compose.recipient,
      cc: this.compose.cc,
      bcc: this.compose.bcc,
      subject: this.compose.subject,
      body: bodyWithSig,
      scheduledAt: this.isScheduled ? this.scheduledTime : '',
      isDraft: false
    };

    this.http.post<any>(`${this.base}/send`, emailPayload, { headers: this.getHeaders() })
      .subscribe({
        next: () => {
          this.showCompose.set(false);
          this.compose = { subject: '', body: '', recipient: '', cc: '', bcc: '' };
          this.showToast(this.isScheduled ? 'Email scheduled!' : 'Email sent!', 'success');
          this.loadFolder(this.activeFolder());
          this.loadFolderCounts();
        },
        error: () => this.showToast('Failed to send email', 'error')
      });
  }

  replyToEmail(all: boolean) {
    const current = this.selectedEmail();
    if (!current) return;
    
    this.openComposeModal();
    this.compose.recipient = current.sender || '';
    if (all && current.cc) {
      this.compose.cc = current.cc;
      this.showCc = true;
    }
    this.compose.subject = current.subject.startsWith('Re:') ? current.subject : 'Re: ' + current.subject;
    this.compose.body = `\n\nOn ${current.createdAt}, ${current.sender} wrote:\n> ` + current.body.split('\n').join('\n> ');
  }

  deleteEmail(email: EmailMessage) {
    if (!email.id) return;
    this.http.put(`${this.base}/${email.id}/folder?folder=trash`, {}, { headers: this.getHeaders() })
      .subscribe({
        next: () => {
          this.emails.update(list => list.filter(e => e.id !== email.id));
          if (this.selectedEmail()?.id === email.id) this.selectedEmail.set(null);
          this.showToast('Moved to Trash', 'success');
          this.loadFolderCounts();
        }
      });
  }

  getFilteredEmails(): EmailMessage[] {
    const s = this.search().toLowerCase();
    const list = this.emails();
    
    let filtered = list;
    if (s) {
      filtered = list.filter(e =>
        e.subject?.toLowerCase().includes(s) ||
        e.sender?.toLowerCase().includes(s) ||
        e.recipient?.toLowerCase().includes(s)
      );
    }
    
    // Group by Thread (e.g. normalized subject or gmailThreadId)
    const threads: Record<string, EmailMessage[]> = {};
    for (const email of filtered) {
      const threadKey = email.gmailThreadId || this.normalizeSubject(email.subject);
      if (!threads[threadKey]) {
        threads[threadKey] = [];
      }
      threads[threadKey].push(email);
    }
    
    const result: any[] = [];
    for (const key of Object.keys(threads)) {
      const sorted = [...threads[key]].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      const latest = sorted[sorted.length - 1];
      latest.threadMessages = sorted;
      result.push(latest);
    }
    
    return result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  normalizeSubject(sub: string): string {
    if (!sub) return 'no-subject';
    return sub.replace(/^(Re|Fwd|RE|FWD):\s*/i, '').trim().toLowerCase();
  }

  getFolderLabel(folder: string): string {
    return folder.charAt(0).toUpperCase() + folder.slice(1);
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
