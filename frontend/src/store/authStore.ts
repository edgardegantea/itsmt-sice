import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser } from '../features/auth/services/auth'
import { rolPrincipal } from '../utils/roles'

interface AuthState {
  token: string | null
  user: AuthUser | null
  // Con qué rol está navegando ahora mismo un usuario con varios roles (p. ej.
  // docente + personal_administrativo) — filtra el menú lateral. Null cuando el
  // usuario solo tiene un rol (no hay nada entre qué elegir).
  activeRole: string | null
  setAuth: (token: string, user: AuthUser) => void
  setActiveRole: (role: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeRole: null,
      setAuth: (token, user) => set({ token, user, activeRole: rolPrincipal(user.roles) }),
      setActiveRole: (role) => set({ activeRole: role }),
      clearAuth: () => set({ token: null, user: null, activeRole: null }),
    }),
    {
      name: 'sice-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
