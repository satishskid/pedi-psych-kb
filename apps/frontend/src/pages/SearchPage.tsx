import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Filter, Download, Eye } from 'lucide-react'
import { Card } from '@pedi-psych/shared'

const SearchPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Card[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  const isRTL = i18n.language === 'ar'

  useEffect(() => {
    if (query.trim()) {
      performSearch()
    } else {
      setResults([])
    }
  }, [query])

  const performSearch = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.results)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (cardId: string) => {
    try {
      const response = await fetch(`/api/export/${cardId}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `card-${cardId}.html`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('app.search')}</h1>
        <p className="mt-2 text-gray-600">
          Search the knowledge base for pediatric psychology guidance
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Search for conditions, treatments, or guidance..."
          />
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-500">Searching...</p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((card) => (
            <div key={card.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {card.title[i18n.language as keyof typeof card.title] || card.title.en}
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {card.content[i18n.language as keyof typeof card.content] || card.content.en}
                  </p>
                  <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                    <span>Category: {card.category}</span>
                    <span>Tags: {card.tags.join(', ')}</span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedCard(card)}
                    className="btn-secondary"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleExport(card.id)}
                    className="btn-primary"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && query && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No results found for "{query}"</p>
        </div>
      )}

      {selectedCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCard.title[i18n.language as keyof typeof selectedCard.title] || selectedCard.title.en}
              </h3>
              <div className="mt-4">
                <p className="text-gray-600">
                  {selectedCard.content[i18n.language as keyof typeof selectedCard.content] || selectedCard.content.en}
                </p>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleExport(selectedCard.id)
                    setSelectedCard(null)
                  }}
                  className="btn-primary"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchPage