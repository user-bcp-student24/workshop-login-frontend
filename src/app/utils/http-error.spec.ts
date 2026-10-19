import { afterEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import { getSafeHttpErrorMessage } from './http-error';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getSafeHttpErrorMessage characterization', () => {
  it('uses a generic network message for an Axios error without a response', () => {
    expect(getSafeHttpErrorMessage({ isAxiosError: true }, 'Request failed')).toBe(
      'No se pudo conectar con el servicio.'
    );
  });

  it('uses the fallback for server and unknown errors without revealing details', () => {
    expect(
      getSafeHttpErrorMessage(
        { isAxiosError: true, response: { data: { detail: 'internal detail' } } },
        'Request failed'
      )
    ).toBe('Request failed');
    expect(getSafeHttpErrorMessage(new Error('private detail'), 'Request failed')).toBe('Request failed');
  });
});
