import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuth from '../hook/useAuth'

function Login() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const API_URL = import.meta.env.VITE_API_URL

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`
  }

  return (
    <div className="min-h-screen w-full">
      {/* Mobile background - hidden on desktop */}
      <div
        className="fixed min-h-screen w-full bg-left-top bg-no-repeat md:hidden"
        style={{ backgroundImage: "url('/assets/mobile_bg.svg')" }}
      ></div>

      {/* Desktop background - hidden on mobile */}
      <div
        className="fixed hidden min-h-screen w-full bg-left-top bg-no-repeat md:block"
        style={{ backgroundImage: "url('/assets/desktop_bg.svg')" }}
      ></div>

      {/* Content wrapper - positioned above backgrounds */}
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center md:flex-row md:justify-evenly md:gap-8">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center md:mb-0">
          <img
            src="/assets/logo_word.png"
            alt="logo"
            className="h-1/4 w-1/4 md:h-1/4 md:w-1/4 md:max-w-[600px]"
          />
        </div>

        {/* Login modal */}
        <div className="mx-auto flex h-auto w-7/8 flex-col items-center justify-center rounded-lg bg-white p-8 shadow-lg md:mx-0 md:w-96">
          <h1 className="text-charcoal-header mb-6 text-2xl font-bold md:text-3xl">
            Welcome to iFeed V2.0
          </h1>

          <p className="mb-8 text-center text-gray-600">
            Sign in or sign up with your Google account to continue.
          </p>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="flex w-full cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <img
              className="mr-2 h-5 w-5"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
            />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
