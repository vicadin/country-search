import { classifySearchError } from '../api/classifySearchError.ts';
import { DEFAULT_REQUEST_TIMEOUT_MS, searchCountries } from '../api/searchCountries.ts';
import type { Country } from '../types/country.ts';
import { debounce } from '../utils/debounce.ts';

export const DEFAULT_DEBOUNCE_MS = 350;

export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface SearchState {
  query: string;
  lastSubmittedQuery: string;
  status: SearchStatus;
  countries: Country[];
  selectedCountry: Country | null;
  errorMessage: string | null;
}

export interface SearchControllerOptions {
  debounceMs?: number;
  timeoutMs?: number;
  onStateChange?: (state: SearchState) => void;
}

export interface SearchController {
  getState: () => SearchState;
  handleInput: (rawQuery: string) => void;
  retry: () => void;
  selectCountry: (countryId: string | null) => void;
  destroy: () => void;
}

export function createSearchController(options: SearchControllerOptions = {}): SearchController {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const onStateChange = options.onStateChange;

  let activeController: AbortController | null = null;
  let state: SearchState = {
    query: '',
    lastSubmittedQuery: '',
    status: 'idle',
    countries: [],
    selectedCountry: null,
    errorMessage: null,
  };

  const emitState = (): void => {
    onStateChange?.({ ...state, countries: [...state.countries] });
  };

  const abortActiveRequest = (): void => {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  };

  const executeSearch = async (trimmedQuery: string): Promise<void> => {
    abortActiveRequest();

    const controller = new AbortController();
    activeController = controller;

    state = {
      ...state,
      lastSubmittedQuery: trimmedQuery,
      status: 'loading',
      errorMessage: null,
    };
    emitState();

    try {
      const countries = await searchCountries(trimmedQuery, controller.signal, timeoutMs);

      if (controller.signal.aborted || activeController !== controller) {
        return;
      }

      activeController = null;
      state = {
        ...state,
        status: countries.length === 0 ? 'empty' : 'success',
        countries,
        selectedCountry: null,
        errorMessage: null,
      };
      emitState();
    } catch (error: unknown) {
      const classification = classifySearchError(error);

      if (!classification.shouldNotifyUser) {
        return;
      }

      if (activeController === controller) {
        activeController = null;
      }

      state = {
        ...state,
        status: 'error',
        countries: [],
        selectedCountry: null,
        errorMessage: classification.message,
      };
      emitState();
    }
  };

  const debouncedSearch = debounce((trimmedQuery: string) => {
    void executeSearch(trimmedQuery);
  }, debounceMs);

  const handleInput = (rawQuery: string): void => {
    debouncedSearch.cancel();
    abortActiveRequest();

    const trimmedQuery = rawQuery.trim();

    if (!trimmedQuery) {
      state = {
        query: rawQuery,
        lastSubmittedQuery: '',
        status: 'idle',
        countries: [],
        selectedCountry: null,
        errorMessage: null,
      };
      emitState();
      return;
    }

    state = {
      ...state,
      query: rawQuery,
      lastSubmittedQuery: trimmedQuery,
      selectedCountry: null,
      errorMessage: null,
    };
    emitState();
    debouncedSearch(trimmedQuery);
  };

  const retry = (): void => {
    const queryToRetry = state.lastSubmittedQuery || state.query.trim();
    if (!queryToRetry) {
      return;
    }

    debouncedSearch.cancel();
    void executeSearch(queryToRetry);
  };

  const selectCountry = (countryId: string | null): void => {
    const selectedCountry = countryId
      ? (state.countries.find((country) => country.id === countryId) ?? null)
      : null;

    state = {
      ...state,
      selectedCountry,
    };
    emitState();
  };

  const destroy = (): void => {
    debouncedSearch.cancel();
    abortActiveRequest();
  };

  return {
    getState: () => ({ ...state, countries: [...state.countries] }),
    handleInput,
    retry,
    selectCountry,
    destroy,
  };
}
