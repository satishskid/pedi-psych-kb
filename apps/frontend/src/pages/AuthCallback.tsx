import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const { setUser } = useAuth()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const userData = urlParams.get('user')
    const error = urlParams.get('error')

    if (error) {
      navigate('/login?error=' + error)
      return
    }

    if (token && userData) {
      try {
        const user = JSON.parse(userData)
        
        // Store user data and token
        localStorage.setItem('user', JSON.stringify(user))
        localStorage.setItem('token', token)
        
        // Update auth context
        setUser(user)
        
        // Redirect to main app
        navigate('/app')
      } catch (error) {
        console.error('Error parsing user data:', error)
        navigate('/login?error=invalid_user_data')
      }
    } else {
      navigate('/login?error=missing_credentials')
    }
  }, [navigate, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}

export default AuthCallback