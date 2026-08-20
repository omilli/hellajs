import { css } from '@hellajs/css';

// The dashboard's theme, one nested object mirroring the DOM — every selector composes
// down from .dashboard. css() returns the generated CSS text on the server (no DOM); the
// server injects it once into the streamed document's <head>. The shell is static, so no
// client re-injection is needed. Deliberately minimal: layout and skeleton visibility only.
export const styles = css({
  body: {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: '42rem',
    margin: '2rem auto',
    padding: '0 1rem',
  },
  '.dashboard': {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '1rem',
      h1: {
        margin: '0',
        fontSize: '1.5rem',
      },
    },
    '.grid': {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
      gap: '1rem',
      '.card': {
        border: '1px solid #e5e7eb',
        padding: '1rem 1.25rem',
        h2: {
          margin: '0 0 0.75rem',
          fontSize: '0.8rem',
          color: '#6b7280',
        },
        dl: {
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '0.25rem 0.75rem',
          margin: '0',
        },
        dd: {
          margin: '0',
          fontWeight: '600',
        },
        '& ul, & ol': {
          margin: '0',
          paddingLeft: '1.25rem',
        },
        '&.skeleton .bone': {
          display: 'block',
          height: '0.75rem',
          marginBottom: '0.5rem',
          background: '#e5e7eb',
        },
      },
    },
  },
});
