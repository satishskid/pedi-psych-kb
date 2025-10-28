import React from 'react'
import { Routes, Route, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Search from './pages/SearchPage'
import CardDetail from './pages/CardDetail'
import Admin from './pages/Admin'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import BookMode from './pages/BookMode'
import Chatbot from './pages/Chatbot'
import LandingPage from './pages/LandingPage'
import SignUpPage from './pages/SignUp'
import { AuthProvider } from './contexts/AuthContext'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/signup",
    element: <SignUpPage />
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />
  },
  {
    path: "/app",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: "search",
        element: <Search />
      },
      {
        path: "cards/:id",
        element: <CardDetail />
      },
      {
        path: "admin",
        element: <Admin />
      },
      {
        path: "book",
        element: <BookMode />
      },
      {
        path: "chatbot",
        element: <Chatbot />
      }
    ]
  }
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
  }
})

function App() {
  // Debug: Log App component re-renders
  React.useEffect(() => {
    console.log('🎯 App component re-rendered at', new Date().toISOString())
  })

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        {/* Removed Clerk SignedIn/SignedOut components to prevent flickering */}
        {/* Authentication UI is now handled consistently in Layout component */}
        <RouterProvider router={router} />
      </AuthProvider>
    </I18nextProvider>
  )
}

export default App