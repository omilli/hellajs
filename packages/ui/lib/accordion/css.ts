import { css } from '../deps';
import { ACCORDION_CONTENT } from './const';

css({
  [`[${ACCORDION_CONTENT}]`]: {
    overflow: 'hidden',
    height: '0',
    transition: 'height 0.3s ease'
  },
}, { global: true });