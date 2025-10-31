import React, { createContext, useContext, useState, useEffect } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'

interface User {
  id: string
  email: string
  name: string
  role: string
  tenant_id: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser()
  const { getToken } = useClerkAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('🔐 AuthContext useEffect triggered:', { isLoaded, hasClerkUser: !!clerkUser, timestamp: new Date().toISOString() })
    
    const setupUser = async () => {
      if (!isLoaded) return

      if (clerkUser) {
        const roleFromClerk = (clerkUser.publicMetadata as any)?.role as string | undefined
        const userData: User = {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.username || 'User',
          role: roleFromClerk || (clerkUser.primaryEmailAddress?.emailAddress === 'satish@skids.health' ? 'admin' : 'parent'),
          tenant_id: 'default',
        }
        setUser(userData)

        // Try to exchange Clerk session for internal JWT
        try {
          const clerkToken = await getToken()
          if (clerkToken) {
            const API_BASE = import.meta.env.VITE_API_URL || ''
            const url = API_BASE ? `${API_BASE}/api/auth/clerk/exchange` : `/api/auth/clerk/exchange`
            const resp = await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${clerkToken}`,
              },
            })
            if (resp.ok) {
              const data = await resp.json()
              // Persist internal JWT for API calls
              localStorage.setItem('token', data.token)
              // Use backend's view of user (ensures role matches server)
              setUser({
                id: data.user.id?.toString?.() || data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: data.user.role,
                tenant_id: data.user.tenant_id?.toString?.() || data.user.tenant_id,
              })
            } else {
              console.warn('Clerk exchange failed', await resp.text())
            }
          }
        } catch (err) {
          console.warn('Clerk exchange error', err)
        }
      } else {
        setUser(null)
        localStorage.removeItem('token')
      }

      setIsLoading(false)
    }

    setupUser()
  }, [clerkUser, isLoaded, getToken])

  const login = async () => {
    throw new Error('Use Clerk authentication instead')
  }

  const logout = () => {
    throw new Error('Use Clerk signOut instead')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}