// Ionic CSS bundle - includes all necessary styles
// Core CSS required for Ionic components to work properly
import '@ionic/core/css/core.css';

// Basic CSS for apps built with Ionic
import '@ionic/core/css/normalize.css';
import '@ionic/core/css/structure.css';
import '@ionic/core/css/typography.css';
// Tailwind CSS
import './index.css';

import { mount } from '../../../packages/dom';
import { HomePage } from './HomePage';

// Determine if the app is running in Capacitor
const isCapacitor = location.protocol === 'capacitor:' || ((window as any).Capacitor && (window as any).Capacitor.platform !== 'web');

// Load Ionic and wait for it before mounting
const ionicLoader = isCapacitor
  ? import(/* @vite-ignore */ location.origin + '/ionic.esm.js')
  : import('@ionic/core/loader').then((m) => m.defineCustomElements(window));

ionicLoader.then(() => {
  // Give Ionic a moment to fully initialize
  requestAnimationFrame(() => {
    mount(HomePage, "#app");
  });
});
