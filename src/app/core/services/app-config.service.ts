import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CrmAppConfig {
  crmApiUrl: string;
  opacApiUrl: string;
  opacAppUrl: string;
  crmAppUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: CrmAppConfig = {
    crmApiUrl:  `http://${window.location.hostname}:8085`,
    opacApiUrl: `http://${window.location.hostname}:8082`,
    opacAppUrl: `http://${window.location.hostname}:8082`,
    crmAppUrl:  `http://${window.location.hostname}:4300`
  };

  constructor(private readonly http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const loaded = await firstValueFrom(this.http.get<CrmAppConfig>('/config.json'));
      this.config = { ...this.config, ...loaded };
    } catch {
      // falls back to hostname-derived defaults above
    }
  }

  get crmApiUrl():  string { return this.config.crmApiUrl; }
  get opacApiUrl(): string { return this.config.opacApiUrl; }
  get opacAppUrl(): string { return this.config.opacAppUrl; }
  get crmAppUrl():  string { return this.config.crmAppUrl; }
}
