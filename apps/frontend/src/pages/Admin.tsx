import React from 'react'
import { useTranslation } from 'react-i18next'

const Admin: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{t('admin.title')}</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">{t('admin.contentPlaceholder')}</p>
      </div>
    </div>
  )
}

export default Admin