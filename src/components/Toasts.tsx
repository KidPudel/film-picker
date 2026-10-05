import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useUI, type Toast } from '../store/useUI';
import './Toasts.css';

/**
 * Sonner-like toasts: enter/exit from the same edge, timers pause on hover,
 * focus and while the tab is hidden. Undo is offered for every reversible action.
 */
export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useUI((s) => s.dismissToast);
  const left = useRef(t.action ? 6000 : 4000);
  const paused = useRef(false);

  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      if (!paused.current && document.visibilityState === 'visible') left.current -= now - last;
      last = now;
      if (left.current <= 0) dismiss(t.id);
    }, 200);
    return () => window.clearInterval(id);
  }, [dismiss, t.id]);

  return (
    <motion.div
      layout
      className="toast"
      role="status"
      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.16 } }}
      transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <span className="toast__text">{t.text}</span>
      {t.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            t.action!.run();
            dismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
    </motion.div>
  );
}
