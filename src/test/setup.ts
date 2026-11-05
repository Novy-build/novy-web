import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Testing Library's auto-cleanup relies on globals being enabled in Vitest,
// which this project does not use — so we register it explicitly here.
afterEach(cleanup);
