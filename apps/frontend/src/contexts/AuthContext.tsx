import React, { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'

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
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('🔐 AuthContext useEffect triggered:', { isLoaded, hasClerkUser: !!clerkUser, timestamp: new Date().toISOString() })
    
    if (!isLoaded) return

    if (clerkUser) {
      // Map Clerk user to our user format
      const userData = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.username || 'User',
        role: 'clinician', // Default role, you can customize this
        tenant_id: 'default', // You can customize this based on your needs
      }
      console.log('✅ Setting user data:', userData)
      setUser(userData)
    } else {
      console.log('🚫 Setting user to null')
      setUser(null)
    }
    setIsLoading(false)
  }, [clerkUser, isLoaded])

  const login = async (email: string, password: string) => {
    // This is no longer needed since Clerk handles authentication
    throw new Error('Use Clerk authentication instead')
  }

  const logout = () => {
    // This is no longer needed since Clerk handles logout
    throw new Error('Use Clerk signOut instead')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}