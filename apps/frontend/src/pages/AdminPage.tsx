import React from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Users, FileText, Settings } from 'lucide-react'

const AdminPage: React.FC = () => {
  const { t } = useTranslation()

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      href: '/admin/users'
    },
    {
      title: 'Policy Management',
      description: 'Configure access policies and rules',
      icon: Shield,
      href: '/admin/policies'
    },
    {
      title: 'Content Management',
      description: 'Manage knowledge base content',
      icon: FileText,
      href: '/admin/content'
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      href: '/admin/settings'
    }
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('app.admin')}</h1>
        <p className="mt-2 text-gray-600">
          Manage system configuration and user access
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {adminSections.map((section) => (
          <div key={section.title} className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <section.icon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                <p className="mt-2 text-gray-600">{section.description}</p>
                <div className="mt-4">
                  <button className="text-primary-600 hover:text-primary-700 font-medium">
                    Access →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">API Status</span>
              <span className="text-green-600 font-medium">Operational</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Database</span>
              <span className="text-green-600 font-medium">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cache</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Users</span>
              <span className="font-medium">156</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Sessions</span>
              <span className="font-medium">23</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Storage Used</span>
              <span className="font-medium">2.4 GB</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <div>
                <div className="text-sm font-medium text-gray-900">User created</div>
                <div className="text-sm text-gray-500">2 hours ago</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <div>
                <div className="text-sm font-medium text-gray-900">Policy updated</div>
                <div className="text-sm text-gray-500">4 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage