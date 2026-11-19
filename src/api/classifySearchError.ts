import { HttpError } from './errors.ts';

export type SearchErrorClassification =
  | {
      kind: 'aborted';
      shouldNotifyUser: false;
      message: null;
    }
  | {
      kind: 'not-found';
      shouldNotifyUser: false;
      message: null;
    }
  | {
      kind: 'timeout';
      shouldNotifyUser: true;
      message: string;
    }
  | {
      kind: 'http';
      status: number;
      shouldNotifyUser: true;
      message: string;
    }
  | {
      kind: 'network';
      shouldNotifyUser: true;
      message: string;
    };

function hasErrorName(error: unknown, targetName: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return 'name' in error && (error as { name: unknown }).name === targetName;
}

export function isAbortError(error: unknown): boolean {
  return hasErrorName(error, 'AbortError');
}

export function isTimeoutError(error: unknown): boolean {
  return hasErrorName(error, 'TimeoutError');
}

export function classifySearchError(error: unknown): SearchErrorClassification {
  if (isAbortError(error)) {
    return {
      kind: 'aborted',
      shouldNotifyUser: false,
      message: null,
    };
  }

  if (isTimeoutError(error)) {
    return {
      kind: 'timeout',
      shouldNotifyUser: true,
      message: 'Request timed out. Please try again.',
    };
  }

  if (error instanceof HttpError) {
    if (error.status === 404) {
      return {
        kind: 'not-found',
        shouldNotifyUser: false,
        message: null,
      };
    }

    return {
      kind: 'http',
      status: error.status,
      shouldNotifyUser: true,
      message: `Server returned an error (${error.status}). Please try again.`,
    };
  }

  return {
    kind: 'network',
    shouldNotifyUser: true,
    message: 'Failed to complete the request. Check your network connection and try again.',
  };
}
