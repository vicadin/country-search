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
      message: 'Превышено время ожидания ответа от сервера. Попробуйте ещё раз.',
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
      message: `Сервер вернул ошибку (${error.status}). Попробуйте повторить запрос.`,
    };
  }

  return {
    kind: 'network',
    shouldNotifyUser: true,
    message: 'Не удалось выполнить запрос. Проверьте подключение к сети и попробуйте снова.',
  };
}
