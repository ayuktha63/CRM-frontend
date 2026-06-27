import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContactsService } from '../../../core/services/contacts.service';

@Component({
  selector: 'app-create-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-contact.html',
  styleUrl: './create-contact.scss'
})
export class CreateContactComponent {

  private contactsService = inject(ContactsService);
  private router = inject(Router);

  contact = {
    fullName: '',
    company: '',
    email: '',
    phone: '',
    jobTitle: '',
    industry: '',
    website: '',
    address: '',
    country: '',
    state: '',
    city: '',
    tags: '',
    notes: ''
  };

  saveContact(): void {
    this.contactsService.createContact(this.contact).subscribe({
      next: () => {
        alert('Contact created successfully');
        this.router.navigate(['/contacts']);
      },
      error: () => {
        alert('Failed to create contact');
      }
    });
  }
}