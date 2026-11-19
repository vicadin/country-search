import { describe, expect, it } from 'vitest';
import { classifySearchError } from '../src/api/classifySearchError.ts';
import { HttpError } from '../src/api/errors.ts';

describe('classifySearchError', () => {
  it('treats AbortError as silent cancellation without user-facing error', () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');

    const result = classifySearchError(abortError);

    expect(result).toEqual({
      kind: 'aborted',
      shouldNotifyUser: false,
      message: null,
    });
  });

  it('treats TimeoutError as a user-facing error distinct from AbortError', () => {
    const timeoutError = new DOMException('The operation timed out.', 'TimeoutError');

    const result = classifySearchError(timeoutError);

    expect(result.kind).toBe('timeout');
    expect(result.shouldNotifyUser).toBe(true);
    expect(result.message).toBeTruthy();
  });

  it('treats non-404 HttpError as a user-facing HTTP error with status', () => {
    const serverError = new HttpError(503, 'Service Unavailable');

    const result = classifySearchError(serverError);

    expect(result.kind).toBe('http');
    expect(result.shouldNotifyUser).toBe(true);
    if (result.kind === 'http') {
      expect(result.status).toBe(503);
    }
    expect(result.message).toContain('503');
  });

  it('treats 404 HttpError as not-found rather than a user-facing failure', () => {
    const notFoundError = new HttpError(404, 'Not Found');

    const result = classifySearchError(notFoundError);

    expect(result).toEqual({
      kind: 'not-found',
      shouldNotifyUser: false,
      message: null,
    });
  });

  it('treats network TypeError and unknown errors as user-facing network failures', () => {
    const networkFailure = new TypeError('Failed to fetch');
    const unknownFailure = 'unexpected failure';

    const networkResult = classifySearchError(networkFailure);
    const unknownResult = classifySearchError(unknownFailure);

    expect(networkResult.kind).toBe('network');
    expect(networkResult.shouldNotifyUser).toBe(true);
    expect(networkResult.message).toBeTruthy();

    expect(unknownResult.kind).toBe('network');
    expect(unknownResult.shouldNotifyUser).toBe(true);
    expect(unknownResult.message).toBeTruthy();
  });
});
