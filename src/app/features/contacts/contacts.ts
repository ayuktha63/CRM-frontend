import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { ContactResponse, ContactsService } from '../../core/services/contacts.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss'
})
export class ContactsComponent implements OnInit {
  private contactsService = inject(ContactsService);
  private cdr = inject(ChangeDetectorRef);

  contacts: ContactResponse[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.loading = true;
    this.errorMessage = '';

    this.contactsService.getContacts()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data: ContactResponse[]) => {
          console.log('Contacts loaded:', data);
          this.contacts = data;
        },
        error: (error) => {
          console.error('Contacts loading failed:', error);
          this.errorMessage = 'Failed to load contacts';
        }
      });
  }
}