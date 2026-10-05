import './Seats.css';

/** Static velvet seats travel with the page, independently of the projector's frame rate. */
export function Seats({ className = '' }: { className?: string }) {
  return <div className={`seats ${className}`} aria-hidden="true" />;
}
