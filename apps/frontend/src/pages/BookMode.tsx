import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  BookOpen, Search, Filter, ChevronRight, ChevronLeft, 
  Bookmark, Download, Share2, Eye, Clock, User, Tag,
  ArrowLeft, Menu, X, Star, Heart, Users, FileText 
} from 'lucide-react'
import { Card as UICard } from '../components/ui/card'
// Note: Card interface is defined locally to match API schema

interface BookChapter {
  id: string
  title: string
  description: string
  icon: React.ElementType
  sections: BookSection[]
}

interface BookSection {
  id: string
  title: string
  cards: Card[]
  estimatedReadTime: number
}

interface Card {
  id: string
  title: Record<string, string>
  description: Record<string, string>
  content: Record<string, any>
  category: string
  tags: string[]
  target_roles: string[]
  languages: string[]
  rtl_languages?: string[]
  access_level?: string
  role_permissions?: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

interface BookSection {
  id: string
  title: string
  cards: Card[]
  estimatedReadTime: number
}

interface ReadingProgress {
  chapterId: string
  sectionId: string
  cardId: string
  progress: number
}

const BookMode: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [chapters, setChapters] = useState<BookChapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState<BookChapter | null>(null)
  const [selectedSection, setSelectedSection] = useState<BookSection | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([])
  const [bookmarkedCards, setBookmarkedCards] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  const isRTL = i18n.language === 'ar'
  const filter = searchParams.get('filter') || 'all'

  // Fetch book structure from API
  const fetchBookStructure = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/content/book-structure?language=${i18n.language}&role=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch book structure');
      }
      
      const data = await response.json();
      
      // Map icon names to actual icon components
      const iconMap: Record<string, React.ElementType> = {
        'BookOpen': BookOpen,
        'Search': Search,
        'TrendingUp': TrendingUp,
        'FileText': FileText,
        'Users': Users,
        'Heart': Heart,
        'Star': Star
      };
      
      // Transform API data to match our interface
      const transformedChapters: BookChapter[] = data.chapters.map((chapter: any) => ({
        ...chapter,
        icon: iconMap[chapter.icon] || BookOpen,
        sections: chapter.sections.map((section: any) => ({
          ...section,
          cards: section.cards.map((card: any) => ({
            ...card,
            // Ensure all required fields are present
            title: card.title || { en: 'Untitled', ar: 'بدون عنوان', fr: 'Sans titre', es: 'Sin título' },
            description: card.description || { 
              en: 'No description available', 
              ar: 'لا توجد وصف متاح', 
              fr: 'Aucune description disponible', 
              es: 'No hay descripción disponible' 
            },
            content: card.content || { 
              en: 'Content not available', 
              ar: 'المحتوى غير متاح', 
              fr: 'Contenu non disponible', 
              es: 'Contenido no disponible' 
            },
            category: card.category || 'general',
            tags: card.tags || [],
            metadata: card.metadata || {},
            access_level: card.access_level || 'public',
            role_permissions: card.role_permissions || [],
            created_at: card.created_at || new Date().toISOString(),
            updated_at: card.updated_at || new Date().toISOString()
          }))
        }))
      }));
      
      setChapters(transformedChapters);
    } catch (error) {
      console.error('Error fetching book structure:', error);
      // Fallback to mock data if API fails
      setChapters(getMockBookStructure());
    } finally {
      setLoading(false);
    }
  };
  
  // Mock book structure as fallback
  const getMockBookStructure = (): BookChapter[] => {
    return [
      {
        id: 'foundations',
        title: 'Foundations of Pediatric Behavioral Health',
        description: 'Core principles and understanding of child development and behavior',
        icon: BookOpen,
        sections: [
          {
            id: 'development-basics',
            title: 'Child Development Fundamentals',
            cards: [
              {
                id: 'dev-001',
                title: { en: 'Understanding Normal Development', ar: 'فهم التطور الطبيعي', hi: 'सामान्य विकास की समझ' },
                description: { en: 'Comprehensive guide to normal child development milestones', ar: 'دليل شامل لمراحل التطور الطبيعي للطفل', hi: 'सामान्य बाल विकास मील के पत्थरों की व्यापक मार्गदर्शिका' },
                content: { 
                  en: 'Comprehensive guide to normal child development milestones including physical, cognitive, social, and emotional development stages from infancy through adolescence.', 
                  ar: 'دليل شامل لمراحل التطور الطبيعي للطفل بما في ذلك المراحل الجسدية والمعرفية والاجتماعية والعاطفية من الرضاعة حتى المراهقة.', 
                  hi: 'सामान्य बाल विकास मील के पत्थरों की व्यापक मार्गदर्शिका जिसमें शिशु अवस्था से किशोरावस्था तक शारीरिक, संज्ञानात्मक, सामाजिक और भावनात्मक विकास चरण शामिल हैं।' 
                },
                category: 'development',
                tags: ['development', 'milestones', 'assessment'],
                metadata: { age_range: { min: 0, max: 18 }, difficulty_level: 'beginner' },
                access_level: 'public',
                role_permissions: ['doctor', 'therapist', 'educator', 'parent'],
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              }
            ],
            estimatedReadTime: 15
          }
        ]
      }
    ];
  };

  useEffect(() => {
    fetchBookStructure();
  }, [filter, i18n.language])

  const handleChapterSelect = (chapter: BookChapter) => {
    setSelectedChapter(chapter)
    setSelectedSection(null)
    setSelectedCard(null)
    setSidebarOpen(false)
  }

  const handleSectionSelect = (section: BookSection) => {
    setSelectedSection(section)
    setSelectedCard(null)
  }

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card)
    // Update reading progress
    const progress: ReadingProgress = {
      chapterId: selectedChapter?.id || '',
      sectionId: selectedSection?.id || '',
      cardId: card.id,
      progress: 100
    }
    setReadingProgress(prev => [...prev.filter(p => p.cardId !== card.id), progress])
  }

  const toggleBookmark = (cardId: string) => {
    setBookmarkedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    )
  }

  const getCardReadStatus = (cardId: string) => {
    return readingProgress.find(p => p.cardId === cardId)?.progress || 0
  }

  const filteredChapters = chapters.filter(chapter => {
    if (searchTerm) {
      return chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             chapter.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
             chapter.sections.some(section => 
               section.title.toLowerCase().includes(searchTerm.toLowerCase())
             )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transition-transform duration-300 ease-in-out`}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <BookOpen className="h-6 w-6 mr-2 text-indigo-600" />
                Pediatric Behavioral Health Guide
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-4 overflow-y-auto h-full pb-20">
            <nav className="space-y-2">
              {filteredChapters.map((chapter) => (
                <div key={chapter.id} className="mb-4">
                  <button
                    onClick={() => handleChapterSelect(chapter)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChapter?.id === chapter.id
                        ? 'bg-indigo-100 text-indigo-900 border-l-4 border-indigo-500'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <chapter.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{chapter.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{chapter.sections.length} sections</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 transform ${
                        selectedChapter?.id === chapter.id ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </button>

                  {selectedChapter?.id === chapter.id && (
                    <div className="ml-6 mt-2 space-y-1">
                      {chapter.sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => handleSectionSelect(section)}
                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                            selectedSection?.id === section.id
                              ? 'bg-indigo-50 text-indigo-800 font-medium'
                              : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{section.title}</span>
                            <span className="text-xs text-gray-400">{section.cards.length} cards</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-4"
                >
                  <Menu className="h-5 w-5" />
                </button>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <button onClick={() => navigate('/')} className="hover:text-gray-700">
                    Home
                  </button>
                  {selectedChapter && (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      <button onClick={() => setSelectedSection(null)} className="hover:text-gray-700">
                        {selectedChapter.title}
                      </button>
                    </>
                  )}
                  {selectedSection && (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      <span className="text-gray-900">{selectedSection.title}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate('/search')}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  title="Advanced Search"
                >
                  <Search className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100" title="Filter">
                  <Filter className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {!selectedChapter ? (
              /* Welcome/Overview Screen */
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-6">
                      <BookOpen className="h-10 w-10 text-indigo-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                      Pediatric Behavioral Health Guide
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                      Explore our comprehensive, evidence-based knowledge base organized like a book. 
                      Navigate by chapters and sections to find the guidance you need.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chapters.map((chapter) => {
                      const Icon = chapter.icon
                      const totalCards = chapter.sections.reduce((sum, section) => sum + section.cards.length, 0)
                      const readCards = chapter.sections.reduce((sum, section) => 
                        sum + section.cards.filter(card => getCardReadStatus(card.id) > 0).length, 0
                      )
                      
                      return (
                        <button
                          key={chapter.id}
                          onClick={() => handleChapterSelect(chapter)}
                          className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                          <div className="flex items-center mb-4">
                            <div className="p-3 bg-indigo-100 rounded-lg">
                              <Icon className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-4 flex-1">
                              <h3 className="font-semibold text-gray-900">{chapter.title}</h3>
                              <p className="text-sm text-gray-500">{chapter.sections.length} sections</p>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">{chapter.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{totalCards} cards</span>
                            {readCards > 0 && (
                              <span className="text-indigo-600 font-medium">
                                {Math.round((readCards / totalCards) * 100)}% read
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : !selectedSection ? (
              /* Chapter Overview */
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8">
                    <div className="flex items-center mb-6">
                      <div className="p-4 bg-indigo-100 rounded-lg">
                        <selectedChapter.icon className="h-8 w-8 text-indigo-600" />
                      </div>
                      <div className="ml-6">
                        <h1 className="text-3xl font-bold text-gray-900">{selectedChapter.title}</h1>
                        <p className="text-lg text-gray-600 mt-2">{selectedChapter.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {selectedChapter.sections.map((section) => {
                      const readCards = section.cards.filter(card => getCardReadStatus(card.id) > 0).length
                      const progress = section.cards.length > 0 ? (readCards / section.cards.length) * 100 : 0
                      
                      return (
                        <button
                          key={section.id}
                          onClick={() => handleSectionSelect(section)}
                          className="w-full bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-1" />
                              {section.estimatedReadTime} min
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">{section.cards.length} knowledge cards</span>
                            <div className="flex items-center space-x-2">
                              {progress > 0 && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-indigo-600">
                                    {Math.round(progress)}%
                                  </span>
                                </div>
                              )}
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : !selectedCard ? (
              /* Section - Card List */
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">{selectedSection.title}</h1>
                    <div className="flex items-center text-sm text-gray-500 mb-6">
                      <Clock className="h-4 w-4 mr-2" />
                      Estimated read time: {selectedSection.estimatedReadTime} minutes
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedSection.cards.map((card) => {
                      const isRead = getCardReadStatus(card.id) > 0
                      const isBookmarked = bookmarkedCards.includes(card.id)
                      const cardTitle = card.title[i18n.language as keyof typeof card.title] || card.title.en
                      const cardContent = card.content[i18n.language as keyof typeof card.content] || card.content.en
                      
                      return (
                        <div
                          key={card.id}
                          className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{cardTitle}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                                <span className="flex items-center">
                                  <Tag className="h-4 w-4 mr-1" />
                                  {card.category}
                                </span>
                                <span className="flex items-center">
                                  <User className="h-4 w-4 mr-1" />
                                  {card.target_roles.join(', ')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleBookmark(card.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isBookmarked ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-100'
                                }`}
                                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                              >
                                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                              </button>
                              {isRead && (
                                <div className="p-2 bg-green-100 rounded-lg" title="Read">
                                  <Eye className="h-4 w-4 text-green-600" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-gray-600 mb-4 line-clamp-3">
                            {cardContent.substring(0, 200)}...
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                              {card.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => handleCardSelect(card)}
                              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Read More
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Card Detail View */
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  {/* Card Header */}
                  <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                          {selectedCard.title[i18n.language as keyof typeof selectedCard.title] || selectedCard.title.en}
                        </h1>
                        <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                          <span className="flex items-center">
                            <Tag className="h-4 w-4 mr-2" />
                            {selectedCard.category}
                          </span>
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            For: {selectedCard.target_roles.join(', ')}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            5 min read
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleBookmark(selectedCard.id)}
                          className={`p-3 rounded-lg transition-colors ${
                            bookmarkedCards.includes(selectedCard.id)
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'hover:bg-gray-100'
                          }`}
                          title={bookmarkedCards.includes(selectedCard.id) ? 'Remove bookmark' : 'Add bookmark'}
                        >
                          <Bookmark className={`h-5 w-5 ${bookmarkedCards.includes(selectedCard.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button className="p-3 hover:bg-gray-100 rounded-lg" title="Download">
                          <Download className="h-5 w-5" />
                        </button>
                        <button className="p-3 hover:bg-gray-100 rounded-lg" title="Share">
                          <Share2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {selectedCard.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Main Content */}
                    <div className="prose max-w-none">
                      <p className="text-lg text-gray-700 leading-relaxed mb-6">
                        {selectedCard.content[i18n.language as keyof typeof selectedCard.content] || selectedCard.content.en}
                      </p>

                      {/* Additional Content Sections */}
                      {selectedCard.content[i18n.language as keyof typeof selectedCard.content] || selectedCard.content.en ? (
                        <div className="bg-indigo-50 p-6 rounded-lg mb-6">
                          <h3 className="text-lg font-semibold text-indigo-900 mb-3">Key Information</h3>
                          <p className="text-indigo-800">
                            {selectedCard.content[i18n.language as keyof typeof selectedCard.content] || selectedCard.content.en}
                          </p>
                        </div>
                      ) : null}

                      {/* Summary */}
                      {selectedCard.description && (
                        <div className="bg-gray-50 p-6 rounded-lg">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Overview</h3>
                          <p className="text-gray-700">{selectedCard.description[i18n.language as keyof typeof selectedCard.description] || selectedCard.description.en}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-6">
                    <button
                      onClick={() => setSelectedCard(null)}
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back to Section
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate('/chatbot', { state: { card: selectedCard } })}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Ask Questions
                        <span className="ml-2 text-xs bg-indigo-500 px-2 py-1 rounded">AI</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookMode