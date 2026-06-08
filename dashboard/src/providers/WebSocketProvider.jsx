import { createContext, useContext, useEffect, useRef, useCallback } from 'react'
import useAppStore from '../stores/useAppStore'

const WebSocketContext = createContext(null)

export function useWebSocket() {
  return useContext(WebSocketContext)
}

export function WebSocketProvider({ children }) {
  const wsRef = useRef(null)
  const reconnectTimeout = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10
  const setWsConnected = useAppStore((s) => s.setWsConnected)
  const addToast = useAppStore((s) => s.addToast)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(`ws://${window.location.host}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
        reconnectAttempts.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          window.dispatchEvent(new CustomEvent('cortex-ws', { detail: msg }))
        } catch (_) {}
      }

      ws.onclose = () => {
        setWsConnected(false)
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        }
      }

      ws.onerror = () => ws.close()
    } catch (_) {}
  }, [setWsConnected])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ send }}>
      {children}
    </WebSocketContext.Provider>
  )
}
