import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import axios from 'axios';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { LoginComponent } from '../login/login.component';
import { DashboardComponent } from '../dashboard/dashboard.component';

let storage: Map<string, string>;

describe('login to tasks flow', () => {
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

  it('logs in, carries the in-memory token to the tasks request, and displays tasks', async () => {
    const tasks = [
      { title: 'Urgent', status: 'IN_PROGRESS', priority: 'URGENT', owner: 'student' }
    ];
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { token: 'token-1', user: { username: 'student' } }
    } as never);
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: tasks } as never);
    const router = { navigate: vi.fn().mockResolvedValue(true) } as unknown as Router;
    const zone = { run: (callback: () => unknown) => callback() } as unknown as NgZone;
    const changeDetector = { detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
    const session = new SessionService();
    const login = new LoginComponent(router, session, new AuthService(), zone, changeDetector);
    login.username = 'student';
    login.password = 'Workshop123!';

    await login.login();

    const dashboard = new DashboardComponent(
      router,
      changeDetector,
      zone,
      session,
      new TasksService()
    );
    await dashboard.ngOnInit();

    expect(post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer token-1' }
    });
    expect(dashboard.visibleTasks.map((task) => task.title)).toEqual(['Urgent']);
    expect(dashboard.loading).toBe(false);
    expect(storage.has('workshop_token')).toBe(false);
  });
});
