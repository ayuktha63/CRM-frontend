import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EditInterceptService {
  private readonly editSubject = new Subject<string>();

  /** Signal that an edit was requested for the given record id. */
  requestEdit(id: string): void {
    this.editSubject.next(id);
  }

  /** Subscribe to be notified when an edit request is intercepted. */
  onEditRequested(): Observable<string> {
    return this.editSubject.asObservable();
  }
}
