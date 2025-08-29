import { resource } from '@hellajs/resource';
import { Suite } from 'benchmark';

const suite = new Suite('Resource - Operations');

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

// New: Cache Strategy Tests
const lruCacheFetcher = async (key) => {
  return new Promise(resolve => setTimeout(() => resolve({ data: `lru-${key}`, size: Math.random() * 1000 }), 1));
};

suite.add('Resource - LRU Cache Simulation', async (deferred) => {
  const resources = Array.from({ length: 50 }, (_, i) => 
    resource(lruCacheFetcher, { 
      key: () => `lru-${i}`,
      cacheTime: 1000,
      maxCacheSize: 10
    })
  );
  
  for (let i = 0; i < 30; i++) {
    resources[i % 50].fetch();
  }
  deferred.resolve();
}, { defer: true });

// New: TTL Expiration Testing
const ttlFetcher = async (key) => {
  return new Promise(resolve => setTimeout(() => resolve({ data: `ttl-${key}`, timestamp: Date.now() }), 1));
};

suite.add('Resource - TTL Expiration', async (deferred) => {
  const shortTtlResource = resource(ttlFetcher, { 
    key: () => 'ttl-test',
    cacheTime: 10 // Very short TTL
  });
  
  shortTtlResource.fetch(); // Initial fetch
  setTimeout(() => {
    shortTtlResource.fetch(); // Should trigger refetch due to TTL
    deferred.resolve();
  }, 15);
}, { defer: true });

// New: Network Simulation (realistic delays)
const slowNetworkFetcher = async (key) => {
  const delay = 50 + Math.random() * 200; // 50-250ms realistic network delay
  return new Promise(resolve => 
    setTimeout(() => resolve({ 
      data: `network-${key}`, 
      delay 
    }), delay)
  );
};

suite.add('Resource - Slow Network Simulation', async (deferred) => {
  const networkResource = resource(slowNetworkFetcher, { key: () => 'slow-test' });
  networkResource.fetch();
  deferred.resolve();
}, { defer: true });

suite.add('Resource - Network Retry Logic', async (deferred) => {
  const unreliableFetcher = async (key) => {
    if (Math.random() < 0.7) {
      throw new Error('Network failure');
    }
    return { data: `retry-${key}` };
  };
  
  const retryResource = resource(unreliableFetcher, { 
    key: () => 'retry-test',
    retries: 3
  });
  
  try {
    retryResource.fetch();
  } catch (e) {
    // Expected occasional failure
  }
  deferred.resolve();
}, { defer: true });

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });