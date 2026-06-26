import { InjectionToken } from '@angular/core';

export interface QuorumAppConfig {
  apiUrl: string;
  socketUrl: string;
  googleClientId: string;
}

export const QUORUM_APP_CONFIG = new InjectionToken<QuorumAppConfig>('QUORUM_APP_CONFIG');
