
import { router, navigate } from '@hellajs/router';

global.suite('Router - Operations', (suite) => {
  suite.add('Router - Initialization', () => {
    router({
      routes: {
        '/': () => {},
        '/users/:id': () => {},
      },
    });
  });

  suite.add('Router - Navigate Simple', () => {
    navigate('/');
  });

  suite.add('Router - Navigate with Params', () => {
    navigate('/users/:id', { id: '123' });
  });

  // New: Complex Route Matching
  const complexRoutes = {};
  for (let i = 0; i < 500; i++) {
    complexRoutes[`/path${i}/:param${i}/subpath${i}`] = () => {};
  }
  const complexRouter = router({ routes: complexRoutes });
  suite.add('Router - Complex Route Matching (500 routes)', () => {
    navigate('/path250/value250/subpath250');
  });

  // New: Hook Execution Overhead
  const hookRouter = router({
    routes: {
      '/hooked': {
        handler: () => {},
        before: () => { let x = 0; for(let i=0; i<100; i++) x++; },
        after: () => { let y = 0; for(let i=0; i<100; i++) y++; }
      }
    }
  });
  suite.add('Router - Hook Execution Overhead', () => {
    navigate('/hooked');
  });
});
