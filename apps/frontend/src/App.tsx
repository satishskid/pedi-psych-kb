import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import CardDetail from './pages/CardDetail'
import Admin from './pages/Admin'
import Login from './pages/Login'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="search" element={<Search />} />
            <Route path="cards/:id" element={<CardDetail />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Routes>
      </AuthProvider>
    </I18nextProvider>
  )
}

export default App