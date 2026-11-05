import type { Screen } from './screen';

/** A starting point offered in the New Project gallery. */
export interface Template {
  id: string;
  name: string;
  description: string;
  screens: Screen[];
}
