import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { focusFirst, focusables, useIsPhone } from '../lib/hooks';
import './Overlay.css';

/*
 * Overlay primitives.
 *  - <Popover>: anchored panel on desktop (scales from its trigger), bottom sheet on phones.
 *  - <Dialog>: modal; centred or a right-hand drawer on desktop, bottom sheet on phones.
 * Both: Esc closes, focus moves in and returns to the trigger, background is `inert`.
 * Sheets can be flicked down to dismiss (velocity-aware, Apple-style).
 */

let inertCount = 0;
function useInertRoot(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.getElementById('root');
    const html = document.documentElement;
    inertCount++;
    root?.setAttribute('inert', '');
    const sw = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    if (sw > 0) html.style.paddingRight = `${sw}px`;
    return () => {
      inertCount--;
      if (inertCount === 0) {
        root?.removeAttribute('inert');
        html.style.overflow = '';
        html.style.paddingRight = '';
      }
    };
  }, [active]);
}

function useEscape(active: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        ref.current();
      }
    };
    // Capture so the innermost (last mounted) overlay closes first.
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

/** Keeps Tab inside a modal panel. */
function trapTab(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return;
  const items = focusables(e.currentTarget);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// ─── Sheet (phones) ────────────────────────────────────────────────────────

function Sheet({
  onClose,
  label,
  children,
  className = '',
  labelledBy,
  tall,
}: {
  onClose: () => void;
  label?: string;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
  tall?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const drag = useDragControls();
  const openedAt = useRef(performance.now());
  useInertRoot(true);
  useEffect(() => focusFirst(panel.current), []);
  // Ignore the "ghost" click a tap can produce right after the sheet mounts.
  const onScrim = () => performance.now() - openedAt.current > 400 && onClose();

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // A quick flick is enough — no need to drag past a threshold.
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  return (
    <div className="ov-layer">
      <motion.div
        className="ov-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onScrim}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        className={`ov-sheet ${tall ? 'ov-sheet--tall' : ''} ${className}`}
        initial={reduce ? { opacity: 0 } : { y: '100%' }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: '100%' }}
        transition={{ type: 'spring', duration: 0.42, bounce: 0 }}
        drag={reduce ? false : 'y'}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.7 }}
        dragListener={false}
        dragControls={drag}
        onDragEnd={onDragEnd}
        onKeyDown={trapTab}
      >
        <div className="ov-sheet__grab" onPointerDown={(e) => !reduce && drag.start(e)}>
          <span aria-hidden="true" />
          <button type="button" className="sr-only" onClick={onClose}>
            Закрыть
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ─── Popover ───────────────────────────────────────────────────────────────

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  children: ReactNode;
  width?: number;
  className?: string;
}

export function Popover(props: PopoverProps) {
  const isPhone = useIsPhone();
  const { open, onClose, anchorRef } = props;

  // Return focus to the trigger when closing.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) {
      const active = document.activeElement;
      if (!active || active === document.body || !document.contains(active)) anchorRef.current?.focus({ preventScroll: true });
      else if (active instanceof HTMLElement && active.closest('.ov-pop, .ov-sheet')) anchorRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open, anchorRef]);

  useEscape(open, onClose);

  return createPortal(
    <AnimatePresence>
      {open &&
        (isPhone ? (
          <Sheet key="sheet" onClose={onClose} label={props.label} className={props.className}>
            <div className="ov-sheet__body">{props.children}</div>
          </Sheet>
        ) : (
          <Floating key="float" {...props} />
        ))}
    </AnimatePresence>,
    document.body,
  );
}

function Floating({ onClose, anchorRef, label, children, width = 340, className = '' }: PopoverProps) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; origin: string } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a || !p) return;
      const h = p.offsetHeight;
      const w = Math.min(width, window.innerWidth - 24);
      const below = a.bottom + 8 + h < window.innerHeight - 12 || a.top < h + 20;
      const top = below ? a.bottom + 8 : a.top - 8 - h;
      const left = Math.min(Math.max(12, a.left + a.width / 2 - w / 2), window.innerWidth - w - 12);
      const originX = Math.min(Math.max(a.left + a.width / 2 - left, 16), w - 16);
      setPos({ top, left, origin: `${originX}px ${below ? 'top' : 'bottom'}` });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef, width]);

  useEffect(() => {
    focusFirst(panel.current);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [anchorRef, onClose]);

  return (
    <motion.div
      ref={panel}
      role="dialog"
      aria-label={label}
      className={`ov-pop ${className}`}
      style={{
        width: Math.min(width, window.innerWidth - 24),
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        transformOrigin: pos?.origin,
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      onBlur={(e) => {
        // Non-modal: tabbing out of the panel closes it.
        const next = e.relatedTarget as Node | null;
        if (next && !panel.current?.contains(next) && !anchorRef.current?.contains(next)) onClose();
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Dialog ────────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Visible subtitle under the title. */
  subtitle?: ReactNode;
  children: ReactNode;
  kind?: 'center' | 'drawer';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Hide the visual header (title stays for screen readers). */
  bare?: boolean;
}

export function Dialog(props: DialogProps) {
  const isPhone = useIsPhone();
  useEscape(props.open, props.onClose);
  return createPortal(
    <AnimatePresence>{props.open && (isPhone ? <PhoneDialog key="p" {...props} /> : <DesktopDialog key="d" {...props} />)}</AnimatePresence>,
    document.body,
  );
}

function DialogHeader({ id, title, subtitle, onClose, bare }: { id: string; title: ReactNode; subtitle?: ReactNode; onClose: () => void; bare?: boolean }) {
  return (
    <header className={`ov-dialog__head ${bare ? 'ov-dialog__head--bare' : ''}`}>
      <div>
        <h2 id={id} className={bare ? 'sr-only' : 'ov-dialog__title'}>
          {title}
        </h2>
        {subtitle && !bare && <p className="ov-dialog__sub">{subtitle}</p>}
      </div>
      <button type="button" className="icon-btn ov-dialog__close" onClick={onClose} aria-label="Закрыть">
        <X aria-hidden="true" />
      </button>
    </header>
  );
}

function useRestoreFocus() {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => {
      // Wait for inert to be lifted before restoring.
      requestAnimationFrame(() => prev?.isConnected && prev.focus({ preventScroll: true }));
    };
  }, []);
}

function PhoneDialog({ onClose, title, subtitle, children, className, bare }: DialogProps) {
  const id = useId();
  useRestoreFocus();
  return (
    <Sheet onClose={onClose} labelledBy={id} className={className} tall>
      <DialogHeader id={id} title={title} subtitle={subtitle} onClose={onClose} bare={bare} />
      <div className="ov-dialog__body">{children}</div>
    </Sheet>
  );
}

function DesktopDialog({ onClose, title, subtitle, children, kind = 'center', size = 'md', className = '', bare }: DialogProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useInertRoot(true);
  useRestoreFocus();
  useEffect(() => focusFirst(panel.current), []);

  const drawer = kind === 'drawer';
  const from = reduce ? { opacity: 0 } : drawer ? { x: '100%' } : { opacity: 0, scale: 0.96, y: 8 };
  const to = reduce ? { opacity: 1 } : drawer ? { x: 0 } : { opacity: 1, scale: 1, y: 0 };

  return (
    <div className={`ov-layer ${drawer ? 'ov-layer--drawer' : 'ov-layer--center'}`}>
      <motion.div className="ov-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onClick={onClose} />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`ov-dialog ov-dialog--${size} ${drawer ? 'ov-dialog--drawer' : ''} ${className}`}
        initial={from}
        animate={to}
        exit={{ ...from, transition: { duration: drawer ? 0.26 : 0.16, ease: [0.23, 1, 0.32, 1] } }}
        transition={drawer ? { type: 'spring', duration: 0.45, bounce: 0 } : { duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        onKeyDown={trapTab}
      >
        <DialogHeader id={id} title={title} subtitle={subtitle} onClose={onClose} bare={bare} />
        <div className="ov-dialog__body">{children}</div>
      </motion.div>
    </div>
  );
}
