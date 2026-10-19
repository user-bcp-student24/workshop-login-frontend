import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import axios from 'axios';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TasksService } from '../services/tasks.service';
import { SessionService } from '../services/session.service';
import { DashboardComponent } from './dashboard.component';

let storage: Map<string, string>;

function createDashboard(session: SessionService): { component: DashboardComponent; router: Router } {
  const router = { navigate: vi.fn().mockResolvedValue(true) } as unknown as Router;
  const changeDetector = { detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
  const zone = { run: (callback: () => void) => callback() } as unknown as NgZone;
  return { component: new DashboardComponent(router, changeDetector, zone, session, new TasksService()), router };
}

describe('DashboardComponent characterization', () => {
  beforeEach(() => {
    storage = new Map([
      ['workshop_preferences', JSON.stringify({ theme: 'dark' })]
    ]);
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

  it('gets tasks with the owner query and bearer token, then filters and sorts them', async () => {
    const tasks = [
      { title: 'Normal', status: 'TODO', priority: 'NORMAL', owner: 'student' },
      { title: 'Normal 2', status: 'TODO', priority: 'NORMAL', owner: 'student' },
      { title: 'Urgent', status: 'IN_PROGRESS', priority: 'URGENT', owner: 'student' },
      { title: 'Archived', status: 'ARCHIVED', priority: 'URGENT', owner: 'student' }
    ];
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: tasks } as never);
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    const { component } = createDashboard(session);

    await component.ngOnInit();

    expect(get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer token-1' }
    });
    expect(component.visibleTasks.map((task) => task.title)).toEqual(['Urgent', 'Normal', 'Normal 2']);
    expect(component.visibleTasks[0].label).toBe('URGENT · STUDENT');
    expect(component.loading).toBe(false);
  });

  it('finishes loading without an error when the API returns an empty task list', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: [] } as never);
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    const { component } = createDashboard(session);

    await component.ngOnInit();

    expect(component.visibleTasks).toEqual([]);
    expect(component.error).toBe('');
    expect(component.loading).toBe(false);
  });

  it('removes token and user on logout while preserving preferences', async () => {
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    const { component, router } = createDashboard(session);

    await component.logout();

    expect(session.getToken()).toBeNull();
    expect(storage.has('workshop_token')).toBe(false);
    expect(storage.has('workshop_user')).toBe(false);
    expect(storage.get('workshop_preferences')).toBe(JSON.stringify({ theme: 'dark' }));
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('redirects to login after a reload because the token is not persisted', async () => {
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    const reloadedSession = new SessionService();
    const get = vi.spyOn(axios, 'get');
    const { component, router } = createDashboard(reloadedSession);

    await component.ngOnInit();

    expect(reloadedSession.getToken()).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('redirects to login and skips the request when no session token exists', async () => {
    const get = vi.spyOn(axios, 'get');
    const { component, router } = createDashboard(new SessionService());

    await component.ngOnInit();

    expect(get).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows a safe generic message when the tasks API returns an internal detail', async () => {
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    vi.spyOn(axios, 'get').mockRejectedValue({
      isAxiosError: true,
      response: { data: { detail: 'database connection string' } }
    });
    const { component } = createDashboard(session);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.error).not.toContain('database');
  });

  it('shows a generic error for an invalid token without clearing the session', async () => {
    const session = new SessionService();
    session.setSession('expired-token', { username: 'student' });
    vi.spyOn(axios, 'get').mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { detail: 'invalid token' } }
    });
    const { component, router } = createDashboard(session);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.loading).toBe(false);
    expect(session.getToken()).toBe('expired-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows a generic error when a successful response is not an iterable task list', async () => {
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { tasks: [] } } as never);
    const { component } = createDashboard(session);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.loading).toBe(false);
  });

  it('shows a connection error and ends loading when the tasks backend is unavailable', async () => {
    const session = new SessionService();
    session.setSession('token-1', { username: 'student' });
    vi.spyOn(axios, 'get').mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
    const { component, router } = createDashboard(session);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo conectar con el servicio.');
    expect(component.loading).toBe(false);
    expect(session.getToken()).toBe('token-1');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
