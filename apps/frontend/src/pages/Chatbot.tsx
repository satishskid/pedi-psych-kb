import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Send, Bot, User, MessageSquare, Brain, 
  Lightbulb, Heart, Users, BookOpen, Search,
  ArrowLeft, Settings, Download, Share2, Star,
  Clock, Target, TrendingUp, Shield, Award
} from 'lucide-react'
import { Card } from '@pedi-psych/shared'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  context?: {
    card?: Card
    intent?: string
    confidence?: number
  }
  suggestions?: string[]
}

interface Metaprompt {
  id: string
  name: string
  description: string
  prompt: string
  icon: React.ElementType
  category: 'diagnostic' | 'therapeutic' | 'educational' | 'support'
}

const Chatbot: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showMetaprompts, setShowMetaprompts] = useState(false)
  const [selectedMetaprompt, setSelectedMetaprompt] = useState<Metaprompt | null>(null)
  const [contextCard, setContextCard] = useState<Card | null>(null)
  const [typing, setTyping] = useState(false)

  const isRTL = i18n.language === 'ar'

  // Metaprompts for different use cases
  const metaprompts: Metaprompt[] = [
    {
      id: 'diagnostic-assistant',
      name: 'Diagnostic Assistant',
      description: 'Help understand symptoms and conditions',
      icon: Brain,
      category: 'diagnostic',
      prompt: 'You are a pediatric behavioral health specialist. Help analyze the following situation with empathy and evidence-based insights. Consider developmental factors, family dynamics, and cultural context. Provide clear, actionable guidance while emphasizing when professional consultation is needed.'
    },
    {
      id: 'therapeutic-guide',
      name: 'Therapeutic Guide',
      description: 'Suggest interventions and strategies',
      icon: Lightbulb,
      category: 'therapeutic',
      prompt: 'You are an experienced child therapist. Based on the child\'s age, developmental stage, and specific challenges, suggest evidence-based therapeutic interventions. Include practical techniques for home, school, and clinical settings. Consider family involvement and cultural sensitivity.'
    },
    {
      id: 'parent-support',
      name: 'Parent Support',
      description: 'Provide guidance for parents',
      icon: Heart,
      category: 'support',
      prompt: 'You are a supportive parenting coach. Help parents understand their child\'s behavior with compassion and practical wisdom. Address their concerns with empathy, provide realistic strategies, and help them build confidence in their parenting abilities while maintaining their emotional well-being.'
    },
    {
      id: 'educator-resources',
      name: 'Educator Resources',
      description: 'Help teachers and school staff',
      icon: Users,
      category: 'educational',
      prompt: 'You are a school psychologist specializing in inclusive education. Help educators understand and support students with behavioral challenges in classroom settings. Provide practical strategies, classroom management techniques, and collaboration approaches with families and specialists.'
    },
    {
      id: 'development-explainer',
      name: 'Development Explainer',
      description: 'Explain developmental concepts',
      icon: TrendingUp,
      category: 'educational',
      prompt: 'You are a developmental psychologist. Explain complex developmental concepts in simple, accessible language. Use relatable examples and help users understand what behaviors are typical versus concerning, and when intervention might be beneficial.'
    },
    {
      id: 'evidence-synthesizer',
      name: 'Evidence Synthesizer',
      description: 'Summarize research and evidence',
      icon: Award,
      category: 'diagnostic',
      prompt: 'You are a research psychologist specializing in evidence-based practices. Synthesize current research findings on the topic, explain what the evidence shows, discuss treatment effectiveness, and provide balanced perspectives on different approaches while acknowledging limitations and areas needing more research.'
    }
  ]

  // Quick start prompts
  const quickStartPrompts = [
    "My 8-year-old seems anxious about school. What should I look for?",
    "How can I help my child manage their emotions better?",
    "What are normal tantrums vs concerning behavior?",
    "How do I talk to my child about their feelings?",
    "When should I seek professional help for my child's behavior?"
  ]

  useEffect(() => {
    // Check if we have a context card from navigation
    if (location.state?.card) {
      setContextCard(location.state.card)
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: `I see you're reading about "${location.state.card.title[i18n.language as keyof typeof location.state.card.title]}". How can I help you understand this topic better? Feel free to ask specific questions or let me know what concerns you have.`,
        timestamp: new Date(),
        context: { card: location.state.card }
      }
      setMessages([welcomeMessage])
    } else {
      // Welcome message for new chat
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: 'Hello! I\'m your pediatric behavioral health assistant. I can help you understand child behavior, provide guidance on developmental concerns, suggest evidence-based strategies, and support you through challenging situations. What would you like to know about?',
        timestamp: new Date(),
        suggestions: quickStartPrompts
      }
      setMessages([welcomeMessage])
    }
    
    // Focus input on load
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [location.state, i18n.language])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const simulateAIResponse = async (userMessage: string, metaprompt?: Metaprompt, context?: any) => {
    setLoading(true)
    setTyping(true)
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))
    
    // Generate contextual response based on metaprompt and context
    let response = ''
    let suggestions: string[] = []
    
    if (context?.card) {
      // Context-aware response based on current card
      response = generateCardContextResponse(userMessage, context.card, metaprompt)
    } else {
      // General response based on metaprompt
      response = generateGeneralResponse(userMessage, metaprompt)
    }
    
    // Generate follow-up suggestions
    suggestions = generateSuggestions(userMessage, context)
    
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      type: 'assistant',
      content: response,
      timestamp: new Date(),
      context: {
        intent: metaprompt?.name || 'general',
        confidence: 0.8 + Math.random() * 0.2
      },
      suggestions
    }
    
    setMessages(prev => [...prev, aiMessage])
    setTyping(false)
    setLoading(false)
  }

  const generateCardContextResponse = (userMessage: string, card: Card, metaprompt?: Metaprompt) => {
    const baseResponse = `Based on the information about "${card.title[i18n.language as keyof typeof card.title]}", let me provide some additional insights: `
    
    // Simulate different response types based on the question
    if (userMessage.toLowerCase().includes('example') || userMessage.toLowerCase().includes('how')) {
      return baseResponse + "Here's a practical example: A 7-year-old showing similar patterns might benefit from structured routines and clear communication. Parents can try setting up visual schedules and using positive reinforcement for desired behaviors."
    } else if (userMessage.toLowerCase().includes('when') || userMessage.toLowerCase().includes('worry')) {
      return baseResponse + "You should consider seeking professional help if these behaviors persist for more than 6 weeks, significantly impact daily functioning, or cause distress to the child or family. Early intervention often leads to better outcomes."
    } else if (userMessage.toLowerCase().includes('why')) {
      return baseResponse + "This behavior often serves a purpose for the child - it might be their way of communicating needs, expressing emotions they can't verbalize, or responding to environmental stressors. Understanding the 'why' helps us respond more effectively."
    } else {
      return baseResponse + "This is a common concern that many families face. The key is consistency, patience, and focusing on building the child's coping skills rather than just stopping the behavior. Would you like specific strategies for your situation?"
    }
  }

  const generateGeneralResponse = (userMessage: string, metaprompt?: Metaprompt) => {
    const persona = metaprompt?.prompt || 'You are a helpful pediatric behavioral health assistant.'
    
    // Simulate different response types
    if (userMessage.toLowerCase().includes('tantrum')) {
      return "Tantrums are a normal part of child development, especially between ages 2-4. They're often a child's way of expressing frustration when they don't have the words or skills to manage big emotions. Key strategies include staying calm, ensuring safety, and teaching emotional regulation skills over time."
    } else if (userMessage.toLowerCase().includes('anxiety')) {
      return "Childhood anxiety is quite common and can manifest differently at various ages. Younger children might show physical complaints, while older children might express worries or avoid situations. Helpful approaches include validating their feelings, teaching coping strategies like deep breathing, and gradually building confidence through small successes."
    } else if (userMessage.toLowerCase().includes('attention')) {
      return "Attention difficulties can have many causes - from normal developmental variations to underlying conditions. Before considering labels, look at the child's environment: Are expectations appropriate? Is the task too hard or too easy? Are there enough movement breaks? Consistent routines and positive reinforcement for focus can make a big difference."
    } else {
      return "That's a great question! Child behavior is complex and influenced by many factors including development, environment, and individual temperament. I'd be happy to provide more specific guidance if you could share a bit more about your situation - the child's age, what behaviors you're seeing, and any specific concerns you have."
    }
  }

  const generateSuggestions = (userMessage: string, context?: any) => {
    const baseSuggestions = [
      "Tell me more about your specific situation",
      "What age is the child you're concerned about?",
      "How long have you been noticing this behavior?",
      "What have you tried so far?",
      "How is this affecting daily life?"
    ]
    
    // Return random subset
    return baseSuggestions.sort(() => 0.5 - Math.random()).slice(0, 3)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    
    await simulateAIResponse(input, selectedMetaprompt || undefined, { card: contextCard })
  }

  const handleQuickPrompt = async (prompt: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: prompt,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    await simulateAIResponse(prompt, selectedMetaprompt || undefined, { card: contextCard })
  }

  const handleMetapromptSelect = (metaprompt: Metaprompt) => {
    setSelectedMetaprompt(metaprompt)
    setShowMetaprompts(false)
    
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      type: 'system',
      content: `Switched to ${metaprompt.name} mode. ${metaprompt.description}`,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, systemMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const exportConversation = () => {
    const conversationText = messages.map(msg => 
      `${msg.type === 'user' ? 'You' : msg.type === 'assistant' ? 'Assistant' : 'System'}: ${msg.content}`
    ).join('\n\n')
    
    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pediatric-psychology-chat-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Bot className="h-6 w-6 mr-2 text-indigo-600" />
                AI Assistant
              </h2>
              <button
                onClick={() => setShowMetaprompts(!showMetaprompts)}
                className="p-2 rounded-lg hover:bg-gray-100"
                title="Select Assistant Mode"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
            
            {selectedMetaprompt && (
              <div className="p-3 bg-indigo-50 rounded-lg">
                <div className="flex items-center">
                  <selectedMetaprompt.icon className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-sm font-medium text-indigo-900">{selectedMetaprompt.name}</span>
                </div>
                <p className="text-xs text-indigo-700 mt-1">{selectedMetaprompt.description}</p>
              </div>
            )}
          </div>

          {/* Metaprompt Selection */}
          {showMetaprompts && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Choose Assistant Mode</h3>
              <div className="space-y-2">
                {metaprompts.map((metaprompt) => (
                  <button
                    key={metaprompt.id}
                    onClick={() => handleMetapromptSelect(metaprompt)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedMetaprompt?.id === metaprompt.id
                        ? 'bg-indigo-100 text-indigo-900 border-l-4 border-indigo-500'
                        : 'hover:bg-white bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <metaprompt.icon className="h-4 w-4 mr-3 text-indigo-600" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{metaprompt.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{metaprompt.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={exportConversation}
                className="flex-1 flex items-center justify-center p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
              <button
                onClick={() => {
                  setMessages([])
                  setContextCard(null)
                  setSelectedMetaprompt(null)
                }}
                className="flex-1 flex items-center justify-center p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                New Chat
              </button>
            </div>
          </div>

          {/* Context Info */}
          {contextCard && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center mb-2">
                <BookOpen className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">Reading Context</span>
              </div>
              <p className="text-sm text-blue-800">
                {contextCard.title[i18n.language as keyof typeof contextCard.title] || contextCard.title.en}
              </p>
              <button
                onClick={() => setContextCard(null)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2"
              >
                Clear Context
              </button>
            </div>
          )}

          {/* Quick Start Prompts */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Questions</h3>
            <div className="space-y-2">
              {quickStartPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="w-full text-left p-3 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/book')}
                  className="p-2 rounded-lg hover:bg-gray-100 mr-4"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
                  <p className="text-sm text-gray-500">
                    {selectedMetaprompt ? selectedMetaprompt.name : 'General Assistant'}
                    {typing && <span className="ml-2 animate-pulse">typing...</span>}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${loading ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-500">
                  {loading ? 'Thinking...' : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-2xl`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-indigo-600 ml-3' 
                        : message.type === 'assistant'
                        ? 'bg-green-600 mr-3'
                        : 'bg-gray-400 mr-3'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : message.type === 'assistant' ? (
                        <Bot className="h-4 w-4 text-white" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-white" />
                      )}
                    </div>
                    
                    <div className={`${
                      message.type === 'user' 
                        ? 'bg-indigo-600 text-white' 
                        : message.type === 'assistant'
                        ? 'bg-white border border-gray-200'
                        : 'bg-gray-100 border border-gray-200'
                    } rounded-2xl px-4 py-3`}>
                      <p className={`text-sm ${
                        message.type === 'user' 
                          ? 'text-white' 
                          : 'text-gray-900'
                      }`}>
                        {message.content}
                      </p>
                      
                      {/* Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">You might also ask:</p>
                          <div className="space-y-1">
                            {message.suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => handleQuickPrompt(suggestion)}
                                className="block w-full text-left text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-2 rounded"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Context info */}
                      {message.context && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                          <div className="flex items-center justify-between">
                            <span>Mode: {message.context.intent}</span>
                            <span>Confidence: {message.context.confidence ? Math.round(message.context.confidence * 100) : 0}%</span>
                          </div>
                        </div>
                      )}
                      
                      <div className={`text-xs mt-2 ${
                        message.type === 'user' 
                          ? 'text-indigo-200' 
                          : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {typing && (
                <div className="flex justify-start">
                  <div className="flex max-w-2xl">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-3 flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-4">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about pediatric behavioral health..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-12"
                    disabled={loading}
                  />
                  {loading && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || loading}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-3 text-xs text-gray-500 text-center">
                This AI assistant provides general guidance based on evidence-based practices. 
                For specific medical concerns, please consult with healthcare professionals.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chatbot