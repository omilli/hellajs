import { css } from '../deps';
import { DIALOG, DIALOG_BACKDROP, DIALOG_PANEL, OPEN } from './const';

css({
  [`[${DIALOG}]`]: {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: '0',
    visibility: 'hidden',
    transition: 'opacity 0.2s ease, visibility 0.2s ease',
  },
  [`[${DIALOG}][data-open]`]: {
    opacity: '1',
    visibility: 'visible',
  },
  [`[${DIALOG_BACKDROP}]`]: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
  },
  [`[${DIALOG_PANEL}]`]: {
    position: 'relative',
    zIndex: '1000',
    overflow: 'auto',
    transform: 'scale(0.95)',
    transition: 'transform 0.2s ease',
  },
  [`[${DIALOG}][${OPEN}] [${DIALOG_PANEL}]`]: {
    transform: 'scale(1)',
  },
}, { global: true });
