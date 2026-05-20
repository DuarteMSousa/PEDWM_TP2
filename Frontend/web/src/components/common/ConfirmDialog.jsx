import { useEffect, useRef } from 'react'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
  cardClassName = '',
  bodyClassName = '',
}) {
  const confirmButtonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape' && !loading) {
        onCancel?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  useEffect(() => {
    if (!open) return
    // Auto-focus confirm button only when dialog opens.
    if (confirmButtonRef.current) {
      confirmButtonRef.current.focus()
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div
      className="rb-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rb-dialog-title"
    >
      <div className={`rb-dialog-card ${cardClassName}`.trim()}>
        <header className="rb-dialog-head">
          <h3 id="rb-dialog-title">{title}</h3>
          <button
            type="button"
            className="rb-dialog-close"
            onClick={onCancel}
            disabled={loading}
            aria-label="Fechar"
          >
            x
          </button>
        </header>

        {description ? <p className="rb-dialog-description">{description}</p> : null}

        {children ? <div className={`rb-dialog-body ${bodyClassName}`.trim()}>{children}</div> : null}

        <footer className="rb-dialog-actions">
          <button
            type="button"
            className="rb-btn-outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={destructive ? 'rb-btn-danger' : 'rb-btn-accept'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'A processar...' : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
