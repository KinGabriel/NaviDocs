import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook that polls an async data-fetching function at a specified interval.
 *
 * @param {Function} fetcher - The async function to call for fetching data. It's memoized with useCallback.
 * @param {number} interval - The polling interval in milliseconds. Polling is disabled if null.
 * @param {Array} initialData - The initial state for the data.
 * @returns {{ data: any, setData: Function, error: Error | null, refetch: Function }}
 */
export function useDataPolling(fetcher, interval, initialData = []) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);

  // Memoize the fetcher function to avoid re-creating it on every render.
  const memoizedFetcher = useCallback(fetcher, [fetcher]);

  const executeFetch = useCallback(async () => {
    try {
      const result = await memoizedFetcher();
      setData(result);
    } catch (err) {
      console.error('Polling fetch failed:', err);
      setError(err);
    }
  }, [memoizedFetcher]);

  useEffect(() => {
    // Don't start polling if the interval is not a positive number.
    if (!interval || interval <= 0) {
      return;
    }

    // Fetch data immediately on mount.
    executeFetch();

    // Set up the polling interval.
    const intervalId = setInterval(executeFetch, interval);

    // Clean up the interval when the component unmounts or dependencies change.
    return () => clearInterval(intervalId);
  }, [interval, executeFetch]);

  return { data, setData, error, refetch: executeFetch };
}