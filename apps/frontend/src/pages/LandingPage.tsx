import React from 'react'
import { useTranslation } from 'react-i18next'
import { Brain, Heart, Shield, Users, BookOpen, MessageCircle, Star, Award, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'

const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  
  const isRTL = i18n.language === 'ar'

  const features = [
    {
      icon: Brain,
      title: "Evidence-Based Science",
      description: "Every recommendation is grounded in peer-reviewed research and clinical best practices from leading pediatric psychology institutions worldwide."
    },
    {
      icon: Heart,
      title: "Empathy-First Approach",
      description: "Content crafted with deep understanding of family dynamics, cultural sensitivities, and the emotional journey of supporting children's mental health."
    },
    {
      icon: Shield,
      title: "Safety & Trust",
      description: "Rigorous fact-checking, expert review, and transparent sourcing ensure reliable, safe guidance for every child's wellbeing."
    },
    {
      icon: Users,
      title: "Multi-Stakeholder Support",
      description: "Tailored resources for clinicians, parents, educators, and therapists - each with role-appropriate depth and accessibility."
    }
  ]

  const testimonials = [
    {
      role: "Pediatric Psychologist",
      name: "Dr. Sarah Chen",
      quote: "This knowledge base has revolutionized how we support families. The evidence-based guidance is immediately applicable and culturally sensitive."
    },
    {
      role: "Parent",
      name: "Ahmed Al-Rashid",
      quote: "Finally, a resource that speaks to us in Arabic and understands our cultural context while providing scientifically sound advice."
    },
    {
      role: "School Counselor",
      name: "Maria Rodriguez",
      quote: "The educator-specific resources have transformed how we support students with behavioral challenges. Absolutely invaluable."
    }
  ]

  const stats = [
    { number: "10,000+", label: "Knowledge Cards" },
    { number: "50+", label: "Countries Served" },
    { number: "99.7%", label: "Accuracy Rate" },
    { number: "24/7", label: "Global Access" }
  ]

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center items-center mb-6">
              <div className="flex items-center space-x-2">
                <Brain className="h-12 w-12 text-indigo-600" />
                <Globe className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="text-indigo-600 block">TinyVibes</span>
              <span className="text-3xl md:text-4xl text-gray-700 block mt-4">
                Science-based AI-powered pediatric behavioral care
              </span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-4 max-w-2xl mx-auto">
              Made by <span className="font-semibold text-indigo-600">GreyBrain.ai</span>
            </p>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Empowering families, clinicians, and educators with evidence-based guidance on pediatric behavioral health. 
              Combining cutting-edge science with deep empathy to support every child's mental wellbeing.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/login" 
                className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <Star className="w-5 h-5 mr-2" />
                Access Knowledge Base
              </Link>
              <button className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg border border-indigo-200">
                <BookOpen className="w-5 h-5 mr-2" />
                Explore Sample Content
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Healthcare Professionals Choose Us
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built on three pillars that ensure every piece of guidance is scientifically sound, culturally sensitive, and immediately applicable
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center p-6 rounded-xl bg-gradient-to-b from-white to-gray-50 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                    <Icon className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Professionals Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See how we're transforming pediatric behavioral health support
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Pediatric Behavioral Health?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-3xl mx-auto">
            Join thousands of healthcare professionals, educators, and families who trust our evidence-based guidance 
            to support children's mental wellbeing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/login" 
              className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              <Award className="w-5 h-5 mr-2" />
              Get Started Today
            </Link>
            <button className="inline-flex items-center px-8 py-4 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-400 transition-colors border border-indigo-400">
              <MessageCircle className="w-5 h-5 mr-2" />
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Brain className="h-8 w-8 text-indigo-400" />
                <span className="text-xl font-bold">Pediatric KB</span>
              </div>
              <p className="text-gray-400">
                The world's most trusted pediatric behavioral knowledge base.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Professionals</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Clinical Guidelines</a></li>
                <li><a href="#" className="hover:text-white">Research Updates</a></li>
                <li><a href="#" className="hover:text-white">Continuing Education</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Families</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Parent Resources</a></li>
                <li><a href="#" className="hover:text-white">Age-Appropriate Content</a></li>
                <li><a href="#" className="hover:text-white">Support Groups</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Pediatric Psychology Knowledge Base. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage