import { useEffect } from 'react'
import { RiCheckLine, RiCloseLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next' // Imported the hook

function Toast({ show, action, message, onHide }) {
  const { t } = useTranslation(); // Initialized the translation function

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [show, onHide])

  if (!show) return null

  return (
    <div 
      className={`
        toast toast-top md:toast-bottom toast-center md:toast-end 
        z-[10000] p-4 
        /* Mobile: shift down 10 units and keep original bottom margin */
        mt-15 mb-20 md:mb-0 md:mt-0
        transition-all duration-300 ease-in-out opacity-90
      `}
    >
      <div
        className={`
          alert flex flex-nowrap items-center gap-3 px-6 py-4 shadow-xl border-none
          rounded-2xl md:rounded-3xl text-white sm:text-sm text-xs
          /* Transparency: 90% opacity for a glass-like feel */
          bg-opacity-90 backdrop-blur-[2px]
          ${action === 'success' ? 'alert-success' : 'alert-error'}
        `}
      >
        <div className="shrink-0">
          {action === 'success' ? (
            <RiCheckLine size={20} className="text-white" />
          ) : (
            <RiCloseLine size={20} className="text-white" />
          )}
        </div>
        
        {/* Wrapped message in t() so parent strings are translated automatically */}
        <span className="font-medium tracking-wide">{message ? t(message) : ''}</span>

        <button 
          onClick={onHide}
          className="ml-2 hover:opacity-100 opacity-50 transition-opacity"
          aria-label={t("Close notification")}
        >
          <RiCloseLine size={18} className="text-white" />
        </button>
      </div>
    </div>
  )
}

export default Toast