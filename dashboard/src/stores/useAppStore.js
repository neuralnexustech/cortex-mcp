import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  activeTab: localStorage.getItem('cortex-tab') || 'overview',
  sidebarCollapsed: localStorage.getItem('cortex-sidebar') === 'true',
  searchOpen: false,
  wsConnected: false,
  toasts: [],

  setActiveTab: (tab) => {
    localStorage.setItem('cortex-tab', tab)
    set({ activeTab: tab })
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    localStorage.setItem('cortex-sidebar', String(next))
    set({ sidebarCollapsed: next })
  },

  setSearchOpen: (open) => set({ searchOpen: open }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  setWsConnected: (connected) => set({ wsConnected: connected }),

  addToast: (toast) => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, toast.duration || 3000)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export default useAppStore
