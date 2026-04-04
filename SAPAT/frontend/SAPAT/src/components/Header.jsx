import useAuth from '../hook/useAuth'
import { useTranslation } from 'react-i18next';

function Header() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation();

  return (
    <header className="bg-white p-2 shadow-sm">
      <div className="text-darkbrown flex items-center justify-between w-full">
        
        {/* Left Side: Logo, Date, and Language Switcher */}
        <div className="flex items-center gap-2">
          <div className="items-left ml-6 flex flex-col">
            <p className="text-darkbrown text-lg font-bold">iFeed V2.0</p>
            <p className="text-sm">
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="join ml-6">
            <button 
              onClick={() => i18n.changeLanguage('en')} 
              className={`btn btn-xs md:btn-sm join-item border-gray font-normal transition-colors ${
                i18n.language === 'en' 
                  ? 'bg-green-button text-white hover:bg-darkbrown' 
                  : 'bg-transparent text-darkbrown hover:bg-gray-100'
              }`}
            >
              EN
            </button>
            <button 
              onClick={() => i18n.changeLanguage('fil')} 
              className={`btn btn-xs md:btn-sm join-item border-gray font-normal transition-colors ${
                i18n.language === 'fil' 
                  ? 'bg-green-button text-white hover:bg-darkbrown' 
                  : 'bg-transparent text-darkbrown hover:bg-gray-100'
              }`}
            >
              FIL
            </button>
          </div>
        </div> {/* Added missing closing div for the left-side container */}

        {/* Right Side: Profile Info */}
        <div className="mr-6 flex items-center gap-2">
          <p className="hidden md:mr-6 md:block md:text-lg md:font-bold">
            {user?.displayName || 'Guest'}
          </p>
          <img
            className="h-10 w-10 rounded-2xl border border-gray-100 shadow-sm"
            alt="Profile"
            src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.displayName || 'Guest'}`}
          />
        </div>
        
      </div>
    </header>
  )
}

export default Header