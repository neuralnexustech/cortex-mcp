import { createContext, useContext, useCallback } from 'react'
import useAppStore from '../stores/useAppStore'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const addToast = useAppStore((s) => s.addToast)

  const toast = useCallback((message, type = 'info', duration = 3000) => {
    addToast({ message, type, duration })
  }, [addToast])

  const success = useCallback((msg) => toast(msg, 'success'), [toast])
  const error = useCallback((msg) => toast(msg, 'error', 5000), [toast])
  const info = useCallback((msg) => toast(msg, 'info'), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ${
            t.type === 'success' ? 'bg-green-500/90 text-white' :
            t.type === 'error' ? 'bg-red-500/90 text-white' :
            'bg-cortex-card text-cortex-text border border-cortex-border'
          }`}
          onClick={() => removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
