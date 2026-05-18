import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ToastContext = createContext(null)

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast) => {
      const id = (nextId += 1)
      const duration = toast.duration ?? 4000
      const next = {
        id,
        kind: toast.kind ?? 'info',
        title: toast.title,
        message: toast.message,
      }
      setToasts((current) => [...current, next])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="rb-toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`rb-toast rb-toast-${toast.kind}`}>
            <div className="rb-toast-body">
              {toast.title ? <strong>{toast.title}</strong> : null}
              {toast.message ? <span>{toast.message}</span> : null}
            </div>
            <button type="button" className="rb-toast-dismiss" onClick={() => dismiss(toast.id)}>
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      push: () => {},
      dismiss: () => {},
    }
  }
  return ctx
}

export function useAutoToast({ message, kind = 'info', duration = 4000 } = {}) {
  const { push } = useToast()
  useEffect(() => {
    if (!message) return
    push({ message, kind, duration })
  }, [message, kind, duration, push])
}
