import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Brain } from 'lucide-react'
import DeepDiveModal from '../components/DeepDiveModal'

const CardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [showDeepDive, setShowDeepDive] = useState(false)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">{t('cardDetail.title')}</h1>
        <button
          onClick={() => setShowDeepDive(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Brain className="h-5 w-5 mr-2" />
          {t('cardDetail.deepDive')}
        </button>
      </div>
      <p className="text-gray-600 mb-4">Card ID: {id}</p>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">{t('cardDetail.contentPlaceholder')}</p>
      </div>

      {showDeepDive && (
        <DeepDiveModal
          cardId={id!}
          onClose={() => setShowDeepDive(false)}
        />
      )}
    </div>
  )
}

export default CardDetail