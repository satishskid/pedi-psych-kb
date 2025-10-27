import React from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Shield, Users, FileText } from 'lucide-react'

const Dashboard: React.FC = () => {
  const { t } = useTranslation()

  const stats = [
    { name: 'Total Cards', value: '1,234', icon: FileText },
    { name: 'Active Users', value: '567', icon: Users },
    { name: 'Searches Today', value: '89', icon: Search },
    { name: 'Policy Rules', value: '45', icon: Shield },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('app.dashboard')}</h1>
        <p className="mt-2 text-gray-600">
          Welcome to the Pediatric Psychology Knowledge Base
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="font-medium text-gray-900">Search Knowledge Base</div>
              <div className="text-sm text-gray-500">Find guidance for specific conditions</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="font-medium text-gray-900">View Recent Exports</div>
              <div className="text-sm text-gray-500">Access previously exported materials</div>
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <div>
                <div className="text-sm font-medium text-gray-900">New card added</div>
                <div className="text-sm text-gray-500">Anxiety management for teens</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <div>
                <div className="text-sm font-medium text-gray-900">Policy updated</div>
                <div className="text-sm text-gray-500">Export permissions modified</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard