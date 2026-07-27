import { Component, inject } from '@angular/core';
import { SessionGuardService } from '../../services/session-guard.service';

@Component({
  selector: 'app-session-guard-modal',
  standalone: true,
  templateUrl: './session-guard-modal.component.html',
  styleUrl: './session-guard-modal.component.scss'
})
export class SessionGuardModalComponent {
  readonly guard = inject(SessionGuardService);
}
