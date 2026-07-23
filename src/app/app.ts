import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OToastComponent } from 'orque-ui';
import { SessionGuardModalComponent } from './core/components/session-guard-modal/session-guard-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OToastComponent, SessionGuardModalComponent],
  template: `<router-outlet /><o-toast /><app-session-guard-modal />`,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class App {}
