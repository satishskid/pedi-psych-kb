import React from 'react'
import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { SignUp } from '@clerk/clerk-react'

const SignUpPage: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <User className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('app.signup') || 'Sign Up'}
          </h2>
        </div>
        
        <SignUp 
          routing="hash"
          signInUrl="/login"
          afterSignUpUrl="/app"
          afterSignInUrl="/app"
        />
      </div>
    </div>
  )
}

export default SignUpPage