import { useCallback, useEffect, useState } from 'react';

export interface SceneIdleState {
  isIdle: boolean;
  markActive: () => void;
}

/**
 * Reports whether the user has left the illustration alone long enough for
 * ambient animation to resume. Only meaningful interactions call markActive,
 * so passive hovering does not keep the scene in an active state forever.
 */
export function useSceneIdle(delayMs = 3500): SceneIdleState {
  const [isIdle, setIsIdle] = useState(true);
  const [lastActivity, setLastActivity] = useState(0);

  const markActive = useCallback(() => {
    setLastActivity(() => Date.now());
    setIsIdle(false);
  }, []);

  useEffect(() => {
    if (isIdle) return;
    const timer = window.setTimeout(() => setIsIdle(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [isIdle, lastActivity, delayMs]);

  return { isIdle, markActive };
}
