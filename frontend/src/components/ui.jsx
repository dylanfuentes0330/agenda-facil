import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { STATUS_LABELS } from '../utils/format';

export function Button({ variant = 'primary', size, loading, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="spin" size={16} aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children, id, required }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="req" aria-hidden> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

function useFieldId(id) {
  const auto = useId();
  return id || auto;
}

export function Input({ label, error, hint, id, required, ...props }) {
  const fid = useFieldId(id);
  return (
    <Field label={label} error={error} hint={hint} id={fid} required={required}>
      <input id={fid} aria-invalid={Boolean(error)} aria-describedby={error ? `${fid}-error` : undefined} required={required} {...props} />
    </Field>
  );
}

export function Select({ label, error, hint, id, required, children, ...props }) {
  const fid = useFieldId(id);
  return (
    <Field label={label} error={error} hint={hint} id={fid} required={required}>
      <select id={fid} aria-invalid={Boolean(error)} required={required} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, id, required, ...props }) {
  const fid = useFieldId(id);
  return (
    <Field label={label} error={error} hint={hint} id={fid} required={required}>
      <textarea id={fid} aria-invalid={Boolean(error)} rows={3} required={required} {...props} />
    </Field>
  );
}

const ALERT_ICONS = { error: AlertTriangle, success: CheckCircle2, info: Info, warning: AlertTriangle };
export function Alert({ type = 'info', title, children }) {
  const Icon = ALERT_ICONS[type];
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden />
      <div>
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="spinner" role="status">
      <Loader2 className="spin" size={22} aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={36} aria-hidden />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>;
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone = 'brand' }) {
  return (
    <div className={`stat stat-${tone}`}>
      {Icon && (
        <span className="stat-icon">
          <Icon size={20} aria-hidden />
        </span>
      )}
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, size }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector('input, select, textarea, button:not(.modal-close)');
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ? `modal-${size}` : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, loading, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Volver
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
