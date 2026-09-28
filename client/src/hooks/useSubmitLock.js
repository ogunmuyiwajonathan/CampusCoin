import { useCallback, useEffect, useRef, useState } from "react";

export function useSubmitLock({ doneFor = 1500 } = {}) {
  const lockedRef = useRef(false);
  const timerRef = useRef(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [minWidth, setMinWidth] = useState(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const measure = useCallback((node) => {
    if (node && node.offsetWidth) setMinWidth(`${node.offsetWidth}px`);
  }, []);

  const lock = useCallback(() => {
    if (lockedRef.current) return false;
    lockedRef.current = true;
    setLocked(true);
    return true;
  }, []);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    setLocked(false);
    setDone(false);
  }, []);

  const finish = useCallback(
    (oneShot) => {
      setDone(true);
      if (oneShot) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        unlock();
      }, doneFor);
    },
    [doneFor, unlock],
  );

  const run = useCallback(
    async (fn, { oneShot = false } = {}) => {
      if (!lock()) return undefined;
      try {
        const result = await fn();
        finish(oneShot);
        return result;
      } catch (error) {
        unlock();
        throw error;
      }
    },
    [lock, unlock, finish],
  );

  return { locked, done, run, lock, unlock, minWidth, measure };
}
