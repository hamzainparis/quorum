import { Injectable } from '@angular/core';

const STORAGE_KEY = 'quorum.clientId';

@Injectable({ providedIn: 'root' })
export class ClientIdService {
  getOrCreate(): string {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  }
}
