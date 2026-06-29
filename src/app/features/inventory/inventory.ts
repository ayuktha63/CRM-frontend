import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface Vendor { id?: number; companyName: string; contactName: string; email: string; phone: string; address: string; status: string; }
interface PriceBook { id?: number; name: string; description: string; active: boolean; }
interface Warehouse { id?: number; name: string; location: string; }
interface WarehouseStock { id?: number; warehouseId: number; productId: number; quantity: number; }
interface PurchaseOrder { id?: number; poNumber: string; vendorId: number; amount: number; status: string; }
interface SalesOrder { id?: number; soNumber: string; dealId: number; amount: number; status: string; }

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.scss']
})
export class InventoryComponent implements OnInit {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/v1/inventory';

  activeTab = signal<'vendors' | 'price-books' | 'warehouses' | 'purchase-orders' | 'sales-orders'>('vendors');
  
  vendors = signal<Vendor[]>([]);
  priceBooks = signal<PriceBook[]>([]);
  warehouses = signal<Warehouse[]>([]);
  purchaseOrders = signal<PurchaseOrder[]>([]);
  salesOrders = signal<SalesOrder[]>([]);
  
  loading = signal(false);
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);
  showForm = signal(false);

  // Vendor form
  vendorForm: Vendor = { companyName: '', contactName: '', email: '', phone: '', address: '', status: 'ACTIVE' };
  // PriceBook form
  priceBookForm: PriceBook = { name: '', description: '', active: true };
  // Warehouse form  
  warehouseForm: Warehouse = { name: '', location: '' };
  // PO form
  poForm: PurchaseOrder = { poNumber: '', vendorId: 0, amount: 0, status: 'DRAFT' };
  // SO form
  soForm: SalesOrder = { soNumber: '', dealId: 0, amount: 0, status: 'DRAFT' };

  tabs = [
    { key: 'vendors', label: 'Vendors', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0' },
    { key: 'price-books', label: 'Price Books', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
    { key: 'warehouses', label: 'Warehouses', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { key: 'purchase-orders', label: 'Purchase Orders', icon: 'M16 11c0 2.209-1.791 4-4 4s-4-1.791-4-4 1.791-4 4-4 4 1.791 4 4zM5 20c0-3.314 3.134-6 7-6s7 2.686 7 6' },
    { key: 'sales-orders', label: 'Sales Orders', icon: 'M9 14l-4-4 4-4M15 14l4-4-4-4' },
  ];

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.http.get<Vendor[]>(`${this.base}/vendors`).pipe(catchError(() => of([]))).subscribe(d => this.vendors.set(d));
    this.http.get<PriceBook[]>(`${this.base}/price-books`).pipe(catchError(() => of([]))).subscribe(d => this.priceBooks.set(d));
    this.http.get<Warehouse[]>(`${this.base}/warehouses`).pipe(catchError(() => of([]))).subscribe(d => this.warehouses.set(d));
    this.http.get<PurchaseOrder[]>(`${this.base}/purchase-orders`).pipe(catchError(() => of([]))).subscribe(d => this.purchaseOrders.set(d));
    this.http.get<SalesOrder[]>(`${this.base}/sales-orders`).pipe(catchError(() => of([]))).subscribe(d => { this.salesOrders.set(d); this.loading.set(false); });
  }

  submitForm() {
    const tab = this.activeTab();
    let req$: any;
    if (tab === 'vendors') req$ = this.http.post<Vendor>(`${this.base}/vendors`, this.vendorForm);
    else if (tab === 'price-books') req$ = this.http.post<PriceBook>(`${this.base}/price-books`, this.priceBookForm);
    else if (tab === 'warehouses') req$ = this.http.post<Warehouse>(`${this.base}/warehouses`, this.warehouseForm);
    else if (tab === 'purchase-orders') req$ = this.http.post<PurchaseOrder>(`${this.base}/purchase-orders`, this.poForm);
    else req$ = this.http.post<SalesOrder>(`${this.base}/sales-orders`, this.soForm);

    req$.subscribe({
      next: () => { this.loadAll(); this.showForm.set(false); this.showToast('Saved successfully!', 'success'); },
      error: () => this.showToast('Failed to save', 'error')
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'success', INACTIVE: 'danger', DRAFT: 'warning', ORDERED: 'info', RECEIVED: 'success', APPROVED: 'success', SHIPPED: 'info', DELIVERED: 'success' };
    return map[status] || 'default';
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
