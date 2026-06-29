import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface CrmModule { id: number; name: string; label: string; isCustom: boolean; }
interface CrmField { id: number; moduleName: string; name: string; label: string; type: string; isRequired: boolean; isReadonly: boolean; selectOptions: string; }

@Component({
  selector: 'app-customization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customization.html',
  styleUrls: ['./customization.scss']
})
export class CustomizationComponent implements OnInit {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/v1';

  activeTab = signal<'modules' | 'fields' | 'layouts'>('modules');
  modules = signal<CrmModule[]>([]);
  fields = signal<CrmField[]>([]);
  loading = signal(false);
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  // New Module Form
  showModuleForm = signal(false);
  newModuleName = '';
  newModuleLabel = '';

  // New Field Form
  showFieldForm = signal(false);
  selectedModule = signal('leads');
  newFieldName = '';
  newFieldLabel = '';
  newFieldType = 'TEXT';
  newFieldRequired = false;
  newFieldOptions = '';
  newFieldFormula = '';

  fieldTypes = ['TEXT', 'NUMBER', 'CURRENCY', 'PHONE', 'EMAIL', 'DATE', 'DATETIME', 'DROPDOWN', 'CHECKBOX', 'FORMULA', 'AUTO_NUMBER', 'LOOKUP'];
  
  systemModules = [
    { name: 'leads', label: 'Leads' },
    { name: 'contacts', label: 'Contacts' },
    { name: 'accounts', label: 'Accounts' },
    { name: 'deals', label: 'Deals' },
    { name: 'activities', label: 'Activities' },
    { name: 'tasks', label: 'Tasks' },
    { name: 'products', label: 'Products' },
    { name: 'quotes', label: 'Quotes' },
    { name: 'invoices', label: 'Invoices' },
    { name: 'campaigns', label: 'Campaigns' },
  ];

  ngOnInit() {
    this.loadModules();
    this.loadFields(this.selectedModule());
  }

  loadModules() {
    this.loading.set(true);
    this.http.get<CrmModule[]>(`${this.base}/metadata/modules`, { withCredentials: false })
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.modules.set(data);
        this.loading.set(false);
      });
  }

  loadFields(moduleName: string) {
    this.selectedModule.set(moduleName);
    this.http.get<CrmField[]>(`${this.base}/metadata/fields/${moduleName}`)
      .pipe(catchError(() => of([])))
      .subscribe(data => this.fields.set(data));
  }

  createModule() {
    if (!this.newModuleName || !this.newModuleLabel) return;
    const params = { name: this.newModuleName, label: this.newModuleLabel };
    this.http.post<CrmModule>(`${this.base}/metadata/modules`, null, { params })
      .subscribe({
        next: mod => {
          this.modules.update(m => [...m, mod]);
          this.showModuleForm.set(false);
          this.newModuleName = '';
          this.newModuleLabel = '';
          this.showToast('Custom module created!', 'success');
        },
        error: () => this.showToast('Failed to create module', 'error')
      });
  }

  createField() {
    if (!this.newFieldName || !this.newFieldLabel) return;
    const mod = this.selectedModule();
    const params: any = {
      name: this.newFieldName, label: this.newFieldLabel,
      type: this.newFieldType, required: this.newFieldRequired,
      readonly: false
    };
    if (this.newFieldOptions) params['options'] = this.newFieldOptions;
    if (this.newFieldFormula) params['formula'] = this.newFieldFormula;

    this.http.post<CrmField>(`${this.base}/metadata/fields/${mod}`, null, { params })
      .subscribe({
        next: field => {
          this.fields.update(f => [...f, field]);
          this.showFieldForm.set(false);
          this.newFieldName = '';
          this.newFieldLabel = '';
          this.showToast('Custom field created!', 'success');
        },
        error: () => this.showToast('Failed to create field', 'error')
      });
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      TEXT: 'T', NUMBER: '#', CURRENCY: '₹', PHONE: '📞',
      EMAIL: '✉', DATE: '📅', DATETIME: '🕒', DROPDOWN: '▼',
      CHECKBOX: '☑', FORMULA: 'fx', AUTO_NUMBER: '🔢', LOOKUP: '🔗'
    };
    return icons[type] || '?';
  }
}
