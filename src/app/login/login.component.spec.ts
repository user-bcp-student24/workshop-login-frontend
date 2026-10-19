import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import axios from 'axios';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { LoginComponent } from './login.component';

let storage: Map<string, string>;

function createRouter(): Router {
  return { navigate: vi.fn().mockResolvedValue(true) } as unknown as Router;
}

function createZone(): NgZone {
  return { run: (callback: () => unknown) => callback() } as unknown as NgZone;
}

function createChangeDetector(): ChangeDetectorRef {
  return { detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
}

describe('LoginComponent characterization', () => {
  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('posts the login contract and persists merged preferences and session', async () => {
    storage.set('workshop_preferences', JSON.stringify({ theme: 'dark' }));
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { token: 'token-1', user: { username: 'student' } }
    } as never);
    const router = createRouter();
    const session = new SessionService();
    const component = new LoginComponent(router, session, new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(session.getToken()).toBe('token-1');
    expect(storage.has('workshop_token')).toBe(false);
    expect(JSON.parse(storage.get('workshop_user') ?? '{}')).toEqual({ username: 'student' });
    expect(JSON.parse(storage.get('workshop_preferences') ?? '{}')).toEqual({
      theme: 'dark',
      showTips: true,
      compact: false
    });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('shows plain validation messages without calling the endpoint', async () => {
    const post = vi.spyOn(axios, 'post');
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());

    await component.login();

    expect(component.message).toBe('Ingrese un usuario.');
    expect(post).not.toHaveBeenCalled();

    component.username = 'student';
    await component.login();

    expect(component.message).toBe('Ingrese una contraseña.');
    expect(post).not.toHaveBeenCalled();
  });

  it('shows a plain message when the backend response has no token', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { user: { username: 'student' } } } as never);
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe('El backend respondió sin token.');
  });

  it('uses a generic message when the successful response has no data object', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({} as never);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe('No se pudo autenticar. Verifique el usuario y la contraseña.');
    expect(component.busy).toBe(false);
  });

  it('does not render user input or backend details as HTML', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue({
      response: { data: { message: '<img src=x onerror=alert(1)>' } }
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());
    component.username = '<svg onload=alert(1)>';
    component.password = 'bad-password';

    await component.login();

    expect(component.message).toBe('No se pudo autenticar. Verifique el usuario y la contraseña.');
    expect(component.message).not.toContain('<');
  });

  it('does not submit if either credential is blank', async () => {
    const post = vi.spyOn(axios, 'post');
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());

    await component.login();
    component.username = 'student';
    await component.login();

    expect(component.message).toBe('Ingrese una contraseña.');
    expect(post).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it('submits once and clears busy after a successful response', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { token: 'token-1', user: { username: 'student' } }
    } as never);
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(post).toHaveBeenCalledTimes(1);
    expect(component.busy).toBe(false);
  });

  it('uses an empty user when a successful response omits it', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { token: 'token-1' } } as never);
    const session = new SessionService();
    const component = new LoginComponent(createRouter(), session, new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(session.getUser()).toEqual({});
  });

  it('shows a generic error if navigation fails after establishing the session', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { token: 'token-1', user: { username: 'student' } }
    } as never);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const session = new SessionService();
    const router = { navigate: vi.fn().mockRejectedValue(new Error('navigation failed')) } as unknown as Router;
    const component = new LoginComponent(router, session, new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(session.getToken()).toBe('token-1');
    expect(component.message).toBe('No se pudo autenticar. Verifique el usuario y la contraseña.');
    expect(component.busy).toBe(false);
  });

  it('clears busy after a failed authentication request', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('network failure'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'bad-password';

    await component.login();

    expect(component.message).toBe('No se pudo autenticar. Verifique el usuario y la contraseña.');
    expect(component.busy).toBe(false);
  });

  it('shows a connection error when the authentication backend is unavailable', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe('No se pudo conectar con el servicio.');
    expect(component.busy).toBe(false);
  });

  it('shows a connection error when the login request times out', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue({
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 5000ms exceeded'
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = new LoginComponent(createRouter(), new SessionService(), new AuthService(), createZone(), createChangeDetector());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe('No se pudo conectar con el servicio.');
    expect(component.busy).toBe(false);
  });

  it('applies request failure state inside Angular zone', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('network failure'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const run = vi.fn((callback: () => void) => callback());
    const detectChanges = vi.fn();
    const zone = { run } as unknown as NgZone;
    const changeDetector = { detectChanges } as unknown as ChangeDetectorRef;
    const component = new LoginComponent(
      createRouter(),
      new SessionService(),
      new AuthService(),
      zone,
      changeDetector
    );
    component.username = 'student';
    component.password = 'bad-password';

    await component.login();

    expect(run).toHaveBeenCalledTimes(2);
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(component.message).toBe('No se pudo autenticar. Verifique el usuario y la contraseña.');
    expect(component.busy).toBe(false);
  });
});
