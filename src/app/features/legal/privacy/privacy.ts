import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrls: ['../legal.scss', './privacy.scss']
})
export class PrivacyComponent {}
