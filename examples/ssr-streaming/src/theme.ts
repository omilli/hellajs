import { css, style, cssText } from '@hellajs/css';

// The dashboard's theme, one hashed class per styled element. css() registers the global
// rules and style() the scoped ones — on both platforms; cssText() then collects the
// generated CSS text (a peek, never a drain) for the server to inject once into the
// streamed document's <head>. The shell is static, so no client re-injection is needed.
// Deliberately minimal: layout and skeleton visibility only.
css({
  body: {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: '42rem',
    margin: '2rem auto',
    padding: '0 1rem',
  },
});

export const dashboard = style({
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
}, { label: 'dashboard' });

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  gap: '1rem',
}, { label: 'grid' });

export const card = style({
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
}, { label: 'card' });

// The skeleton's loading bar — self-contained, so the skeleton card is just card + bones.
export const bone = style({
  display: 'block',
  height: '0.75rem',
  marginBottom: '0.5rem',
  background: '#e5e7eb',
}, { label: 'bone' });

// Collected after the registration above — joins in first-registration order.
export const styles = cssText();
