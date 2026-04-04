import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  RiDashboardLine,
  RiLeafLine,
  RiStackLine,
  RiFlaskLine,
  RiLogoutBoxLine,
} from 'react-icons/ri'
import useAuth from '../hook/useAuth'
import ConfirmationModal from './modals/ConfirmationModal.jsx'
import { useState } from 'react'

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [targetPath, setTargetPath] = useState(null)

  const menuItems = [
    { path: '/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
    { path: '/ingredients', icon: RiLeafLine, label: 'Ingredients' },
    { path: '/nutrients', icon: RiStackLine, label: 'Nutrients' },
    { path: '/formulations', icon: RiFlaskLine, label: 'Formulate' },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleNavigation = (e, path) => {
    e.preventDefault()
    if (location.pathname === path) return

    const isFormulationDetailPage = /^\/formulations\/[^\/]+$/.test(location.pathname)
    if (isFormulationDetailPage) {
      setTargetPath(path)
      setIsConfirmationModalOpen(true)
    } else {
      navigate(path)
    }
  }

  return (
    /* Mobile: h-16 (fixed height), w-full, row. 
       Desktop: h-full, w-44, column.
    */
    <div className="bg-green-accent fixed bottom-0 left-0 z-50 flex h-16 w-full flex-row items-center justify-center border-t border-black/5 p-1 md:relative md:h-full md:w-44 md:flex-col md:justify-start md:border-t-0 md:p-3">
      {/* Logo: Centered on Desktop */}
      <div className="mb-8 hidden w-full justify-center md:flex">
        <img src="/assets/logo.png" alt="SAPAT Logo" className="h-16 w-16" />
      </div>

      {/* Nav Container: Centered on both */}
      <nav className="flex w-full flex-row items-center justify-center gap-1 md:flex-col md:gap-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavigation(e, item.path)}
              className={`flex flex-1 flex-col items-center justify-center rounded-xl py-2 transition-all md:w-full md:flex-row md:justify-start md:px-4 ${
                isActive 
                  ? 'text-deepbrown bg-white shadow-sm font-bold' 
                  : 'text-darkbrown hover:bg-white/40'
              }`}
            >
              <item.icon className="h-5 w-5 md:h-6 md:w-6" />
              <span className="mt-1 text-[10px] md:ml-3 md:mt-0 md:text-sm">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Mobile Logout: Placed at the end of the row, centered */}
        <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-darkbrown hover:text-red-600 md:hidden"
        >
          <RiLogoutBoxLine className="h-5 w-5" />
          <span className="mt-1 text-[10px]">Logout</span>
        </button>
      </nav>

      {/* Desktop Logout: Centered at the bottom */}
      <div className="mt-auto hidden pb-10 md:block w-full">
        <button
          onClick={handleLogout}
          className="text-darkbrown hover:bg-red-500 flex w-full items-center justify-center rounded-xl p-2 transition-colors hover:text-white md:justify-start md:px-4"
        >
          <RiLogoutBoxLine className="h-6 w-6" />
          <span className="ml-3 hidden md:block">Logout</span>
        </button>
      </div>

      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={() => {
          navigate(targetPath);
          setIsConfirmationModalOpen(false);
        }}
        title="Unsaved Changes"
        description="You have unsaved formulation progress. Are you sure you want to leave?"
        type="save"
      />
    </div>
  )
}

export default Sidebar