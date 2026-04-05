import { RiFileUploadLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'

function Import({ onImport }) {
  const { t } = useTranslation()
  return (
    <button
      className="border-deepbrown text-deepbrown hover:bg-deepbrown active:bg-deepbrown/80 flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-sm transition-colors hover:text-white md:gap-2 md:px-4 md:py-2 md:text-base"
      onClick={onImport}
    >
      <RiFileUploadLine className="h-4 w-4 md:h-5 md:w-5" />
      <span>{t('Import')}</span>
    </button>
  )
}

export default Import
