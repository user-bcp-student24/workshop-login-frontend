import { afterEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import axios from 'axios';
import { TasksService } from './tasks.service';

describe('TasksService characterization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gets tasks with the owner query and existing bearer header', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: [] } as never);
    const service = new TasksService();

    await service.getTasks('student', 'token-1');

    expect(get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer token-1' }
    });
  });
});
