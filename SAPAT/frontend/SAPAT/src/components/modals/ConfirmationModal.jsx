import { RiCloseLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type,
}) {
  const { t } = useTranslation()
  return (
    <dialog
      id="confirmation_modal"
      className={`modal ${isOpen ? 'modal-open' : ''}`}
    >
      <div className="modal-box relative mt-[64px] w-11/12 max-w-md rounded-3xl bg-white md:mt-0">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle absolute top-4 right-4"
          onClick={onClose}
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-2 text-lg font-bold">{title}</h3>
        <p className="mb-6 text-sm text-gray-600">{description}</p>

        {/* Modal actions */}
        <div className="modal-action">
          <button className={`${type === 'save' ? 'hidden' : ''} btn rounded-xl px-8`} onClick={onClose}>
            {t('Cancel')}
          </button>
          {type === 'delete' ? (
            <button
              className="btn rounded-xl bg-red-500 px-8 text-white hover:bg-red-600"
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              {t('Delete')}
            </button>
          ) : (type === 'save') ? (
            <div className={`tooltip`} data-tip={t('This exits the page.')}>
              <button
                className="btn btn-warning rounded-xl px-8 text-white"
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
              >
                {t('It\'s Already Saved.')}
              </button>
            </div>
          ) : (
            <button
              className="btn rounded-xl bg-green-500 px-8 text-white hover:bg-green-600"
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              {t('Add')}
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>{t('close')}</button>
      </form>
    </dialog>
  )
}

export default ConfirmationModal
