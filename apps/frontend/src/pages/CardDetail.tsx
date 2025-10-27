import React from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const CardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{t('cardDetail.title')}</h1>
      <p className="text-gray-600 mb-4">Card ID: {id}</p>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">{t('cardDetail.contentPlaceholder')}</p>
      </div>
    </div>
  )
}

export default CardDetail