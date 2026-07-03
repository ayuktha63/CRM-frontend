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
  private config: CrmAppConfig | null = null;

  constructor(private readonly http: HttpClient) {}

  async load(): Promise<void> {
    this.config = await firstValueFrom(this.http.get<CrmAppConfig>('/config.json'));
  }

  private get<K extends keyof CrmAppConfig>(key: K): CrmAppConfig[K] {
    if (!this.config) throw new Error(`AppConfig not loaded — missing /config.json`);
    return this.config[key];
  }

  get crmApiUrl():  string { return this.get('crmApiUrl'); }
  get opacApiUrl(): string { return this.get('opacApiUrl'); }
  get opacAppUrl(): string { return this.get('opacAppUrl'); }
  get crmAppUrl():  string { return this.get('crmAppUrl'); }
}
