import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// jsdom does not implement matchMedia; provide a default (light) mock so
// components that read the color scheme (e.g. the theme toggle) render in tests.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Local mock repositories add simulated latency. Under parallel test load the
// default 1000ms async query timeout can expire before the seeded dashboard
// renders, so give findBy*/waitFor a little more headroom.
configure({ asyncUtilTimeout: 3000 });

// Testing Library's auto-cleanup relies on globals being enabled in Vitest,
// which this project does not use — so we register it explicitly here.
afterEach(cleanup);
