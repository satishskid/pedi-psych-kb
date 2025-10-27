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
import BookMode from './pages/BookMode'
import Chatbot from './pages/Chatbot'
import LandingPage from './pages/LandingPage'
import { AuthProvider } from './contexts/AuthContext'

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
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
})

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </I18nextProvider>
  )
}

export default App