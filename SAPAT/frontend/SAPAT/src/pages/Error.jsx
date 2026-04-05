import { useTranslation } from 'react-i18next'

function Error() {
  const { t } = useTranslation()
  return (
    <div>
      <h1>{t('Error')}</h1>
    </div>
  )
}

export default Error
