import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageAction } from 'orque-ui';

interface KanbanColumn {
  name: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kanban.html',
  styleUrl: './kanban.scss'
})
export class KanbanComponent implements OnInit, OnChanges {
  @Input() resource = '';
  @Input() data: any[] = [];
  @Output() action = new EventEmitter<PageAction>();

  columns: KanbanColumn[] = [];
  draggedOverColumn: string | null = null;

  ngOnInit(): void {
    this.setupColumns();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resource']) {
      this.setupColumns();
    }
  }

  setupColumns(): void {
    if (this.resource === 'deals') {
      this.columns = [
        { name: 'Prospecting', label: 'Prospecting', color: '#9CA3AF' },
        { name: 'Qualification', label: 'Qualification', color: '#3B82F6' },
        { name: 'Proposal', label: 'Proposal', color: '#F59E0B' },
        { name: 'Negotiation', label: 'Negotiation', color: '#F97316' },
        { name: 'Closed Won', label: 'Closed Won', color: '#10B981' },
        { name: 'Closed Lost', label: 'Closed Lost', color: '#EF4444' }
      ];
    } else if (this.resource === 'leads') {
      this.columns = [
        { name: 'NEW', label: 'New', color: '#3B82F6' },
        { name: 'QUALIFIED', label: 'Qualified', color: '#10B981' },
        { name: 'CONVERTED', label: 'Converted', color: '#8B5CF6' },
        { name: 'DISQUALIFIED', label: 'Disqualified', color: '#EF4444' }
      ];
    } else if (this.resource === 'tasks') {
      this.columns = [
        { name: 'PENDING', label: 'Pending', color: '#F59E0B' },
        { name: 'IN_PROGRESS', label: 'In Progress', color: '#3B82F6' },
        { name: 'COMPLETED', label: 'Completed', color: '#10B981' },
        { name: 'CANCELLED', label: 'Cancelled', color: '#9CA3AF' }
      ];
    } else {
      this.columns = [];
    }
  }

  getCardsForColumn(colName: string): any[] {
    return this.data.filter(item => {
      const val = item.stage || item.status;
      return val && val.toString().toUpperCase() === colName.toUpperCase();
    });
  }

  getTitle(item: any): string {
    return item.dealName || item.fullName || item.title || item.companyName || 'Record';
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    return name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  triggerAction(actionName: string, item: any): void {
    this.action.emit({
      action: actionName,
      row: item,
      payload: item
    });
  }

  // HTML5 Drag and Drop events
  onDragStart(event: DragEvent, item: any): void {
    event.dataTransfer?.setData('text/plain', item.id.toString());
  }

  onDragOver(event: DragEvent, colName: string): void {
    event.preventDefault();
    this.draggedOverColumn = colName;
  }

  onDragLeave(): void {
    this.draggedOverColumn = null;
  }

  onDrop(event: DragEvent, targetColName: string): void {
    event.preventDefault();
    this.draggedOverColumn = null;
    const itemIdStr = event.dataTransfer?.getData('text/plain');
    if (!itemIdStr) return;
    const itemId = parseInt(itemIdStr, 10);
    const item = this.data.find(d => d.id === itemId);
    if (item) {
      const updatedItem = { ...item };
      if (this.resource === 'deals') {
        updatedItem.stage = targetColName;
      } else {
        updatedItem.status = targetColName;
      }
      this.triggerAction('save', updatedItem);
    }
  }
}
