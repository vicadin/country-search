import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from '../src/state/searchController.ts';

interface DeferredFetchCall {
  url: string;
  signal: AbortSignal;
  resolve: (response: Response) => void;
  reject: (reason?: unknown) => void;
}

const createCountryJson = (name: string, alpha3Code: string) => ({
  name,
  nativeName: name,
  alpha3Code,
  capital: `${name} City`,
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 1000000,
  area: 50000,
  flag: '🏳️',
  flags: { svg: `https://example.com/${alpha3Code.toLowerCase()}.svg` },
  languages: [{ name: 'Language' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
  borders: [],
  demonym: `${name}ian`,
});

function createSignalAwareFetchMock() {
  const calls: DeferredFetchCall[] = [];

  const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const signal = init?.signal;

    if (!signal) {
      throw new Error('Expected fetch to receive an AbortSignal');
    }

    return new Promise<Response>((resolve, reject) => {
      const onAbort = () => {
        const reason =
          signal.reason instanceof Error
            ? signal.reason
            : new DOMException('The operation was aborted.', 'AbortError');
        reject(reason);
      };

      if (signal.aborted) {
        onAbort();
        return;
      }

      signal.addEventListener('abort', onAbort, { once: true });
      calls.push({ url, signal, resolve, reject });
    });
  });

  return { fetchMock, calls };
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
  await vi.advanceTimersByTimeAsync(0);
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

describe('searchController race condition and abort handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('aborts an earlier slower request when a newer query arrives and keeps only the latest result', async () => {
    const { fetchMock, calls } = createSignalAwareFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const controller = createSearchController({ debounceMs: 300 });

    controller.handleInput('sp');
    vi.advanceTimersByTime(300);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain('/sp');
    expect(calls[0]?.signal.aborted).toBe(false);
    expect(controller.getState().status).toBe('loading');

    // Typing a new query must abort the in-flight request immediately, before the new debounce finishes
    controller.handleInput('spain');
    expect(calls[0]?.signal.aborted).toBe(true);

    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toContain('/spain');

    // Newer request ('spain') resolves FIRST
    calls[1]?.resolve(
      new Response(JSON.stringify([createCountryJson('Spain', 'ESP')]), { status: 200 })
    );
    await flushMicrotasks();

    // Older request ('sp') attempts to resolve AFTER 'spain'
    calls[0]?.resolve(
      new Response(JSON.stringify([createCountryJson('Singapore', 'SGP')]), { status: 200 })
    );
    await flushMicrotasks();

    const state = controller.getState();
    expect(state.status).toBe('success');
    expect(state.errorMessage).toBeNull();
    expect(state.countries).toHaveLength(1);
    expect(state.countries[0]?.name).toBe('Spain');

    controller.destroy();
  });

  it('immediately aborts an active request and resets to idle without error when input is cleared', async () => {
    const { fetchMock, calls } = createSignalAwareFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const controller = createSearchController({ debounceMs: 300 });

    controller.handleInput('france');
    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(1);
    expect(controller.getState().status).toBe('loading');

    controller.handleInput('   ');
    await flushMicrotasks();

    expect(calls[0]?.signal.aborted).toBe(true);
    expect(controller.getState()).toMatchObject({
      query: '   ',
      status: 'idle',
      countries: [],
      errorMessage: null,
    });

    controller.destroy();
  });

  it('transitions to empty on 404 without treating it as an error', async () => {
    const { fetchMock, calls } = createSignalAwareFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const controller = createSearchController({ debounceMs: 300 });

    controller.handleInput('atlantis');
    vi.advanceTimersByTime(300);
    calls[0]?.resolve(new Response('Not Found', { status: 404 }));
    await flushMicrotasks();

    expect(controller.getState()).toMatchObject({
      status: 'empty',
      countries: [],
      errorMessage: null,
    });

    controller.destroy();
  });

  it('sets error state on server failure and retries the latest entered query', async () => {
    const { fetchMock, calls } = createSignalAwareFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const controller = createSearchController({ debounceMs: 300 });

    controller.handleInput('italy');
    vi.advanceTimersByTime(300);
    calls[0]?.resolve(new Response('Server Error', { status: 500 }));
    await flushMicrotasks();

    expect(controller.getState().status).toBe('error');
    expect(controller.getState().errorMessage).toContain('500');

    controller.retry();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toContain('/italy');
    expect(controller.getState().status).toBe('loading');

    calls[1]?.resolve(
      new Response(JSON.stringify([createCountryJson('Italy', 'ITA')]), { status: 200 })
    );
    await flushMicrotasks();

    expect(controller.getState().status).toBe('success');
    expect(controller.getState().countries[0]?.name).toBe('Italy');
    expect(controller.getState().errorMessage).toBeNull();

    controller.destroy();
  });
});
