import axios from 'axios';

export function getSafeHttpErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && !error.response) {
    return 'No se pudo conectar con el servicio.';
  }
  return fallback;
}