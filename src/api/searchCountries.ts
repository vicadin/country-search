import type { Country, RawCountry } from '../types/country.ts';
import { mapCountryResponse } from '../utils/mapCountryResponse.ts';
import { HttpError } from './errors.ts';

export { HttpError };

const API_BASE_URL = 'https://countries.dev/name';
export const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

interface ComposedSignal {
  signal: AbortSignal;
  cleanup: () => void;
}

function composeRequestSignal(callerSignal: AbortSignal, timeoutMs: number): ComposedSignal {
  if (typeof AbortSignal.timeout === 'function' && typeof AbortSignal.any === 'function') {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    return {
      signal: AbortSignal.any([callerSignal, timeoutSignal]),
      cleanup: () => {},
    };
  }

  const combinedController = new AbortController();

  const forwardCallerAbort = (): void => {
    const reason =
      callerSignal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
    combinedController.abort(reason);
  };

  if (callerSignal.aborted) {
    forwardCallerAbort();
    return { signal: combinedController.signal, cleanup: () => {} };
  }

  callerSignal.addEventListener('abort', forwardCallerAbort, { once: true });

  const timeoutId = setTimeout(() => {
    combinedController.abort(new DOMException('The operation timed out.', 'TimeoutError'));
  }, timeoutMs);

  const cleanup = (): void => {
    clearTimeout(timeoutId);
    callerSignal.removeEventListener('abort', forwardCallerAbort);
  };

  return { signal: combinedController.signal, cleanup };
}

export async function searchCountries(
  query: string,
  signal: AbortSignal,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<Country[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const { signal: combinedSignal, cleanup } = composeRequestSignal(signal, timeoutMs);

  try {
    const url = `${API_BASE_URL}/${encodeURIComponent(trimmedQuery)}`;
    const response = await fetch(url, { signal: combinedSignal });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new HttpError(response.status, `Request failed with status ${response.status}`);
    }

    const raw = (await response.json()) as RawCountry[];
    return mapCountryResponse(raw);
  } finally {
    cleanup();
  }
}
