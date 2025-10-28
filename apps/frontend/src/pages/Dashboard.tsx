import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { 
  Search, BookOpen, MessageCircle, Users, FileText, Heart, 
  TrendingUp, Clock, Star, AlertCircle, CheckCircle, 
  Calendar, Download, Eye, Filter, Plus, Edit, Settings 
} from 'lucide-react'
import { Card } from '@pedi-psych/shared'

interface DashboardStats {
  totalCards: number
  recentSearches: number
  bookmarkedCards: number
  recentExports: number
}

interface QuickAction {
  title: string
  description: string
  icon: React.ElementType
  action: () => void
  variant?: 'primary' | 'secondary'
}

interface RecentActivity {
  type: 'search' | 'export' | 'bookmark' | 'view'
  title: string
  timestamp: string
  details?: string
}

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { user: clerkUser, isLoaded } = useUser()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalCards: 0,
    recentSearches: 0,
    bookmarkedCards: 0,
    recentExports: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [bookmarkedCards, setBookmarkedCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  const isRTL = i18n.language === 'ar'

  // Create a user object compatible with the existing role-based logic
  const user = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    name: clerkUser.fullName || clerkUser.username || 'User',
    role: 'clinician', // Default role, you can customize this based on Clerk metadata
    tenant_id: 'default'
  } : null

  // Role-specific content and actions
  const getRoleSpecificContent = () => {
    switch (user?.role) {
      case 'clinician':
        return {
          welcomeTitle: "Clinical Dashboard",
          welcomeMessage: "Access evidence-based protocols, assessment tools, and treatment guidance tailored for clinical practice.",
          primaryActions: [
            {
              title: "Search Clinical Protocols",
              description: "Find condition-specific treatment guidelines and assessment tools",
              icon: Search,
              action: () => navigate('/app/search?type=clinical'),
              variant: 'primary' as const
            },
            {
              title: "Browse by Condition",
              description: "Explore organized content by diagnostic categories",
              icon: BookOpen,
              action: () => navigate('/app/book?filter=conditions'),
              variant: 'primary' as const
            },
            {
              title: "Assessment Tools",
              description: "Access validated scales and screening instruments",
              icon: FileText,
              action: () => navigate('/app/search?type=assessment'),
              variant: 'secondary' as const
            },
            {
              title: "Cultural Considerations",
              description: "Region-specific guidance for diverse populations",
              icon: Users,
              action: () => navigate('/app/search?type=cultural'),
              variant: 'secondary' as const
            }
          ],
          stats: [
            { name: 'Clinical Protocols', value: '2,847', icon: FileText },
            { name: 'Assessment Tools', value: '156', icon: TrendingUp },
            { name: 'Recent Searches', value: '23', icon: Search },
            { name: 'Bookmarked Cases', value: '12', icon: Star }
          ]
        }
      case 'parent':
        return {
          welcomeTitle: "Parent Support Center",
          welcomeMessage: "Find age-appropriate guidance, practical strategies, and emotional support for your child's behavioral development.",
          primaryActions: [
            {
              title: "Search Parent Resources",
              description: "Find guidance for your child's specific age and challenges",
              icon: Search,
              action: () => navigate('/app/search?type=parent-friendly'),
              variant: 'primary' as const
            },
            {
              title: "Developmental Milestones",
              description: "Understand what's typical at each age and stage",
              icon: Heart,
              action: () => navigate('/app/book?filter=development'),
              variant: 'primary' as const
            },
            {
              title: "Ask the Expert Chat",
              description: "Get personalized guidance from our AI assistant",
              icon: MessageCircle,
              action: () => navigate('/app/chatbot'),
              variant: 'secondary' as const
            },
            {
              title: "Parent Community",
              description: "Connect with other parents facing similar challenges",
              icon: Users,
              action: () => navigate('/app/community'),
              variant: 'secondary' as const
            }
          ],
          stats: [
            { name: 'Parent Resources', value: '1,234', icon: Heart },
            { name: 'Age-Specific Guides', value: '8', icon: Users },
            { name: 'Saved Articles', value: '15', icon: Star },
            { name: 'Chat Sessions', value: '7', icon: MessageCircle }
          ]
        }
      case 'educator':
        return {
          welcomeTitle: "Educator Resource Hub",
          welcomeMessage: "Access classroom strategies, behavioral interventions, and educational resources for supporting students' mental health.",
          primaryActions: [
            {
              title: "Classroom Strategies",
              description: "Find evidence-based interventions for classroom challenges",
              icon: Search,
              action: () => navigate('/app/search?type=classroom'),
              variant: 'primary' as const
            },
            {
              title: "Behavioral Interventions",
              description: "Step-by-step guides for common behavioral issues",
              icon: BookOpen,
              action: () => navigate('/app/book?filter=behavioral'),
              variant: 'primary' as const
            },
            {
              title: "Individual Education Plans",
              description: "Templates and guidance for IEP development",
              icon: FileText,
              action: () => navigate('/app/search?type=iep'),
              variant: 'secondary' as const
            },
            {
              title: "Professional Development",
              description: "Training resources and continuing education",
              icon: TrendingUp,
              action: () => navigate('/app/training'),
              variant: 'secondary' as const
            }
          ],
          stats: [
            { name: 'Classroom Resources', value: '892', icon: FileText },
            { name: 'Intervention Guides', value: '67', icon: TrendingUp },
            { name: 'Training Modules', value: '12', icon: BookOpen },
            { name: 'Student Cases', value: '34', icon: Users }
          ]
        }
      case 'therapist':
        return {
          welcomeTitle: "Therapy Resource Center",
          welcomeMessage: "Access therapeutic techniques, treatment protocols, and specialized resources for pediatric mental health therapy.",
          primaryActions: [
            {
              title: "Therapeutic Techniques",
              description: "Evidence-based therapy approaches and interventions",
              icon: Search,
              action: () => navigate('/app/search?type=therapeutic'),
              variant: 'primary' as const
            },
            {
              title: "Treatment Protocols",
              description: "Structured treatment plans for various conditions",
              icon: BookOpen,
              action: () => navigate('/app/book?filter=protocols'),
              variant: 'primary' as const
            },
            {
              title: "Assessment Instruments",
              description: "Validated tools for therapy evaluation",
              icon: FileText,
              action: () => navigate('/app/search?type=assessment'),
              variant: 'secondary' as const
            },
            {
              title: "Supervision Resources",
              description: "Guidance for clinical supervision and training",
              icon: Users,
              action: () => navigate('/app/supervision'),
              variant: 'secondary' as const
            }
          ],
          stats: [
            { name: 'Therapy Protocols', value: '445', icon: FileText },
            { name: 'Intervention Techniques', value: '89', icon: TrendingUp },
            { name: 'Assessment Tools', value: '34', icon: Search },
            { name: 'Supervision Cases', value: '18', icon: Users }
          ]
        }
      default:
        return {
          welcomeTitle: "Welcome to Pediatric KB",
          welcomeMessage: "Access comprehensive pediatric behavioral health resources.",
          primaryActions: [
            {
              title: "Search Knowledge Base",
              description: "Find guidance for specific conditions",
              icon: Search,
              action: () => navigate('/app/search'),
              variant: 'primary' as const
            },
            {
              title: "Browse Content",
              description: "Explore organized knowledge cards",
              icon: BookOpen,
              action: () => navigate('/app/book'),
              variant: 'primary' as const
            }
          ],
          stats: [
            { name: 'Total Cards', value: '1,234', icon: FileText },
            { name: 'Active Users', value: '567', icon: Users },
            { name: 'Searches Today', value: '89', icon: Search },
            { name: 'Policy Rules', value: '45', icon: TrendingUp }
          ]
        }
    }
  }

  // Memoize content to prevent recalculation on every render
  const content = React.useMemo(() => getRoleSpecificContent(), [user?.role])

  // Debug: Log re-renders with more detail
  React.useEffect(() => {
    console.log('🔄 Dashboard re-render:', { 
      isLoaded, 
      loading, 
      userRole: user?.role, 
      statsTotalCards: stats.totalCards,
      recentActivityLength: recentActivity.length,
      contentStatsLength: content.stats.length,
      timestamp: new Date().toISOString()
    })
  })

  // Debug: Log user role changes
  React.useEffect(() => {
    console.log('👤 User role changed:', user?.role, 'at', new Date().toISOString())
  }, [user?.role])

  // Debug: Log loading state changes
  React.useEffect(() => {
    console.log('⏳ Loading state changed:', loading, 'at', new Date().toISOString())
  }, [loading])

  // Log when user role changes
  React.useEffect(() => {
    console.log('User role changed:', user?.role)
  }, [user?.role])

  // Log loading state changes
  React.useEffect(() => {
    console.log('Loading state changed:', loading)
  }, [loading])

  useEffect(() => {
    // Only load data if Clerk has loaded and user is available
    if (!isLoaded || !user) return;

    // Use a flag to track if this is the initial load
    const isInitialLoad = stats.totalCards === 0;
    
    const loadDashboardData = async () => {
      // Only show loading state on initial load
      if (isInitialLoad) {
        setLoading(true)
      }
      
      try {
        // Simulate API calls with shorter timeout
        await new Promise(resolve => setTimeout(resolve, 150))
        
        // Set mock data based on role
        setStats({
          totalCards: parseInt(content.stats[0].value.replace(/,/g, '')),
          recentSearches: parseInt(content.stats[2]?.value?.replace(/,/g, '') || '0'),
          bookmarkedCards: parseInt(content.stats[2]?.value?.replace(/,/g, '') || '0'),
          recentExports: 5
        })

        // Set recent activity
        setRecentActivity([
          {
            type: 'search',
            title: 'Anxiety management in adolescents',
            timestamp: '2 hours ago',
            details: 'Found 12 relevant cards'
          },
          {
            type: 'export',
            title: 'ADHD classroom strategies',
            timestamp: '1 day ago',
            details: 'Exported 3 cards as PDF'
          },
          {
            type: 'bookmark',
            title: 'Cultural considerations for GCC families',
            timestamp: '3 days ago'
          }
        ])

      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        // Only hide loading if this was the initial load
        if (isInitialLoad) {
          setLoading(false)
        }
      }
    }

    loadDashboardData()
  }, [user?.role, isLoaded, content]) // Removed stats.totalCards to prevent loop

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'search': return Search
      case 'export': return Download
      case 'bookmark': return Star
      case 'view': return Eye
      default: return CheckCircle
    }
  }

  // Show single consolidated loading state
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!isLoaded ? 'Loading user data...' : 'Loading dashboard...'}
          </p>
          {/* Debug info visible in UI */}
          <div className="mt-4 text-xs text-gray-500 font-mono">
            <div>isLoaded: {isLoaded ? 'true' : 'false'}</div>
            <div>loading: {loading ? 'true' : 'false'}</div>
            <div>user: {user ? user.role : 'null'}</div>
            <div>stats.totalCards: {stats.totalCards}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div key={user?.role} className={`space-y-8 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Debug section - remove this after testing */}
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-yellow-800 mb-2">Debug Info (remove in production)</h3>
        <div className="text-sm text-yellow-700 font-mono space-y-1">
          <div>User Role: {user?.role || 'null'}</div>
          <div>isLoaded: {isLoaded ? 'true' : 'false'}</div>
          <div>loading: {loading ? 'true' : 'false'}</div>
          <div>stats.totalCards: {stats.totalCards}</div>
          <div>recentActivity.length: {recentActivity.length}</div>
          <div>Content stats: {content.stats.length}</div>
        </div>
      </div>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-3">{content.welcomeTitle}</h1>
        <p className="text-indigo-100 text-lg max-w-3xl">{content.welcomeMessage}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {content.stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="card bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <Icon className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="card bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {content.primaryActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all text-left ${
                      action.variant === 'primary' 
                        ? 'border-indigo-300 hover:border-indigo-500 bg-indigo-50 hover:bg-indigo-100' 
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        action.variant === 'primary' ? 'bg-indigo-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          action.variant === 'primary' ? 'text-indigo-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = getActivityIcon(activity.type)
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    {activity.details && (
                      <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Additional Role-Specific Sections */}
      {user?.role === 'clinician' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="card bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Cases</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900">Anxiety in 8-year-old</span>
                  <span className="text-xs text-gray-500">Yesterday</span>
                </div>
                <p className="text-sm text-gray-600">Successfully implemented CBT techniques, 60% improvement</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900">ADHD Management</span>
                  <span className="text-xs text-gray-500">2 days ago</span>
                </div>
                <p className="text-sm text-gray-600">School-based intervention plan implemented</p>
              </div>
            </div>
          </div>

          <div className="card bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Training</h3>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900">Cultural Competency</span>
                  <span className="text-xs text-blue-600">Tomorrow</span>
                </div>
                <p className="text-sm text-gray-600">Working with GCC families - 2 hours</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900">New Assessment Tools</span>
                  <span className="text-xs text-gray-500">Next week</span>
                </div>
                <p className="text-sm text-gray-600">Updated anxiety screening protocols</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'parent' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="card bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Child's Development</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Social Skills</p>
                  <p className="text-sm text-gray-600">Age-appropriate development</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Emotional Regulation</p>
                  <p className="text-sm text-gray-600">Some challenges noted</p>
                </div>
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Resources</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                <p className="font-medium text-gray-900">Helping Your Child Manage Anxiety</p>
                <p className="text-sm text-gray-600">Age 6-8 • Practical strategies</p>
              </button>
              <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <p className="font-medium text-gray-900">Building Emotional Intelligence</p>
                <p className="text-sm text-gray-600">Daily activities and games</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard