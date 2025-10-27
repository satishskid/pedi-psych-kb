import React from 'react'
import { Outlet, Link, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Search, Home, Shield } from 'lucide-react'

const Layout: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const isRTL = i18n.language === 'ar'

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/app" className="text-xl font-bold text-gray-900">
                {t('app.title')}
              </Link>
              <div className="flex space-x-4">
                <Link
                  to="/app"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  {t('app.dashboard')}
                </Link>
                <Link
                  to="/app/search"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {t('app.search')}
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/app/admin"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t('app.admin')}
                  </Link>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="text-sm border-gray-300 rounded-md"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="ar">العربية</option>
              </select>
              
              <span className="text-sm text-gray-700">
                {user.name} ({user.role})
              </span>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('app.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout