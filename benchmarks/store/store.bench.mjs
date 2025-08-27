
import { store } from '@hellajs/store';
import { signal } from '@hellajs/core';

global.suite('Store - Operations', (suite) => {
  suite.add('Store - Create Simple', () => {
    store({ count: 0 });
  });

  suite.add('Store - Create Nested', () => {
    store({
      user: {
        name: 'John',
        address: { city: 'NY' }
      }
    });
  });

  const s = store({ count: 0 });
  suite.add('Store - Read Property', () => {
    s.count();
  });

  suite.add('Store - Write Property', () => {
    s.count(1);
  });

  const nestedStore = store({
    user: {
      name: 'John',
      address: { city: 'NY' }
    }
  });
  suite.add('Store - Update Partial Deep', () => {
    nestedStore.update({ user: { address: { city: 'LA' } } });
  });

  // New: Deep Nested Updates
  const deepStore = store({
    a: {
      b: {
        c: {
          d: {
            e: {
              f: 0
            }
          }
        }
      }
    }
  });
  suite.add('Store - Deep Nested Update', () => {
    deepStore.update({ a: { b: { c: { d: { e: { f: 1 } } } } } });
  });

  // New: Array Mutations
  const arrayStore = store({ items: ['a', 'b', 'c'] });
  suite.add('Store - Array Push', () => {
    arrayStore.items([...arrayStore.items(), 'd']);
  });
  suite.add('Store - Array Pop', () => {
    const current = arrayStore.items();
    arrayStore.items(current.slice(0, current.length - 1));
  });

  // New: Cleanup Performance
  const largeNestedStore = store({
    data: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      value: signal(i), // Use signal to simulate reactive properties
      nested: {
        prop1: signal('test'),
        prop2: signal(true)
      }
    }))
  });
  suite.add('Store - Cleanup Large Nested Store', () => {
    largeNestedStore.cleanup();
  });
});
