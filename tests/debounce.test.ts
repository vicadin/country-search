import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../src/utils/debounce.ts';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not invoke the callback before the delay has elapsed', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced('spain');
    vi.advanceTimersByTime(299);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('spain');
  });

  it('resets the timer when called again before the delay expires', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced('s');
    vi.advanceTimersByTime(200);
    debounced('sp');
    vi.advanceTimersByTime(200);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('sp');
  });

  it('passes all arguments from the most recent call', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 150);

    debounced('first', 1);
    debounced('second', 2);
    vi.advanceTimersByTime(150);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second', 2);
  });

  it('allows independent executions across separate time windows', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 200);

    debounced('italy');
    vi.advanceTimersByTime(200);

    debounced('france');
    vi.advanceTimersByTime(200);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, 'italy');
    expect(callback).toHaveBeenNthCalledWith(2, 'france');
  });

  it('cancels a pending invocation when cancel() is called', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced('germany');
    vi.advanceTimersByTime(150);
    debounced.cancel();
    vi.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();
  });
});
