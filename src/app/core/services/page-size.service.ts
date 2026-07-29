import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'crm_page_size';
const DEFAULT_PAGE_SIZE = 25;

/** Single source of truth for the "Records Per Page" General Settings value,
 *  shared between the settings screens (which write it) and paginated tables
 *  (which read it). A signal so tables update live when the setting is saved. */
@Injectable({ providedIn: 'root' })
export class PageSizeService {
  readonly pageSize = signal<number>(this.readStored());

  private readStored(): number {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return stored > 0 ? stored : DEFAULT_PAGE_SIZE;
  }

  set(value: number): void {
    localStorage.setItem(STORAGE_KEY, String(value));
    this.pageSize.set(value);
  }
}
