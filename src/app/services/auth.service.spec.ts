import { afterEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import axios from 'axios';
import { AuthService } from './auth.service';

describe('AuthService characterization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the existing login payload to the existing endpoint with its timeout', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { token: 'token-1', user: { username: 'student' } }
    } as never);
    const service = new AuthService();

    await service.login('student', 'Workshop123!');

    expect(post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
  });
});
