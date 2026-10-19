import { Injectable } from '@angular/core';
import { SessionUser, UserPreferences } from '../models/session.model';

const USER_STORAGE_KEY = 'workshop_user';
const PREFERENCES_STORAGE_KEY = 'workshop_preferences';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private token: string | null = null;
  private user: SessionUser | null = null;

  setSession(token: string, user: SessionUser): void {
    this.token = token;
    this.user = user;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): SessionUser {
    if (this.user) {
      return this.user;
    }

    try {
      const saved: unknown = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '{}');
      if (isSessionUser(saved)) {
        this.user = saved;
        return saved;
      }
    } catch {
      return {};
    }

    return {};
  }

  clearSession(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  loadPreferences(defaults: UserPreferences): UserPreferences {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}');
      if (isRecord(saved)) {
        return {
          theme: typeof saved.theme === 'string' ? saved.theme : defaults.theme,
          showTips: typeof saved.showTips === 'boolean' ? saved.showTips : defaults.showTips,
          compact: typeof saved.compact === 'boolean' ? saved.compact : defaults.compact
        };
      }
      return { ...defaults };
    } catch {
      return { ...defaults };
    }
  }

  savePreferences(preferences: UserPreferences): void {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSessionUser(value: unknown): value is SessionUser {
  return isRecord(value) &&
    (value.username === undefined || typeof value.username === 'string') &&
    (value.displayName === undefined || typeof value.displayName === 'string');
}