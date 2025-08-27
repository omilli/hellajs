
import { resource } from '@hellajs/resource';

global.suite('Resource - Operations', (suite) => {
  const mockFetcher = async (key) => {
    return new Promise(resolve => setTimeout(() => resolve({ data: `fetched-${key}` }), 1));
  };

  suite.add('Resource - Creation', () => {
    resource(mockFetcher, { key: () => 'test' });
  });

  const resFetch = resource(mockFetcher, { key: () => 'fetch-test' });
  suite.add('Resource - Fetch', async (deferred) => {
    resFetch.fetch();
    deferred.resolve();
  }, { defer: true });

  const resCache = resource(mockFetcher, { key: () => 'cache-test', cacheTime: 1000 });
  suite.add('Resource - Cache Hit', async (deferred) => {
    resCache.fetch(); // Populate cache
    resCache.fetch(); // Cache hit
    deferred.resolve();
  }, { defer: true });

  // New: Error Handling
  const mockErrorFetcher = async () => {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch failed')), 1));
  };
  const resError = resource(mockErrorFetcher, { key: () => 'error-test' });
  suite.add('Resource - Error Handling', async (deferred) => {
    try {
      resError.fetch();
    } catch (e) {
      // Expected error
    }
    deferred.resolve();
  }, { defer: true });

  // New: Concurrent Fetches
  const concurrentFetcher = async (key) => {
    return new Promise(resolve => setTimeout(() => resolve({ data: `concurrent-${key}` }), 1));
  };
  suite.add('Resource - Concurrent Fetches (10)', async (deferred) => {
    const resources = Array.from({ length: 10 }, (_, i) => resource(concurrentFetcher, { key: () => `conc-${i}` }));
    Promise.all(resources.map(r => r.fetch()));
    deferred.resolve();
  }, { defer: true });

  // New: Cache Invalidation
  const resInvalidate = resource(mockFetcher, { key: () => 'invalidate-test', cacheTime: 1000 });
  suite.add('Resource - Invalidate', async (deferred) => {
    resInvalidate.fetch(); // Populate cache
    resInvalidate.invalidate(); // Invalidate and refetch
    deferred.resolve();
  }, { defer: true });
});
