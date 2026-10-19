import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import { SessionService } from './session.service';

let storage: Map<string, string>;

function installStorage(): void {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  });
}

describe('SessionService', () => {
  beforeEach(installStorage);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the token in memory and persists only non-secret user and preferences', () => {
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    session.savePreferences({ theme: 'dark', showTips: true, compact: false });

    expect(session.getToken()).toBe('token-1');
    expect(session.getUser()).toEqual({ username: 'student' });
    expect(storage.has('workshop_token')).toBe(false);
    expect(storage.get('workshop_user')).toBe(JSON.stringify({ username: 'student' }));
    expect(storage.get('workshop_preferences')).toBe(
      JSON.stringify({ theme: 'dark', showTips: true, compact: false })
    );
  });

  it('does not restore the token after a reload and clears user without clearing preferences', () => {
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    session.savePreferences({ theme: 'dark', showTips: true, compact: false });

    const reloadedSession = new SessionService();
    expect(reloadedSession.getToken()).toBeNull();
    expect(reloadedSession.getUser()).toEqual({ username: 'student' });

    reloadedSession.clearSession();

    expect(reloadedSession.getToken()).toBeNull();
    expect(storage.has('workshop_token')).toBe(false);
    expect(storage.has('workshop_user')).toBe(false);
    expect(storage.get('workshop_preferences')).toBe(
      JSON.stringify({ theme: 'dark', showTips: true, compact: false })
    );
  });

  it('merges saved preferences over the supplied defaults', () => {
    storage.set('workshop_preferences', JSON.stringify({ theme: 'dark' }));
    const session = new SessionService();

    expect(session.loadPreferences({ theme: 'light', showTips: true, compact: false })).toEqual({
      theme: 'dark',
      showTips: true,
      compact: false
    });
  });

  it('falls back safely when stored user or preferences are malformed', () => {
    storage.set('workshop_user', '{invalid');
    storage.set('workshop_preferences', JSON.stringify({ theme: 5, showTips: 'yes', compact: null }));
    const session = new SessionService();

    expect(session.getUser()).toEqual({});
    expect(session.loadPreferences({ theme: 'light', showTips: true, compact: false })).toEqual({
      theme: 'light',
      showTips: true,
      compact: false
    });
  });

  it('uses defaults when stored preferences are invalid JSON or not an object', () => {
    const defaults = { theme: 'light', showTips: true, compact: false };
    storage.set('workshop_preferences', '{invalid');
    expect(new SessionService().loadPreferences(defaults)).toEqual(defaults);

    storage.set('workshop_preferences', JSON.stringify(['dark']));
    expect(new SessionService().loadPreferences(defaults)).toEqual(defaults);
  });

  it('rejects stored user objects with fields of the wrong type', () => {
    storage.set('workshop_user', JSON.stringify({ username: 42 }));

    expect(new SessionService().getUser()).toEqual({});
  });
});
