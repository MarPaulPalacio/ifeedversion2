import { useState, useCallback } from 'react'
import { debounce } from 'lodash'
import { RiSearchLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'
export default function Search({ handleFilterQuery }) {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = useCallback(
    debounce((query) => {
      handleFilterQuery('query', query)
    }, 500),
    []
  )

  const handleChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    handleSearch(query)
  }

  return (
    <div className="relative w-[240px]">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
        <RiSearchLine className="h-4 w-4 text-gray-500" />
      </div>
      <input
        type="text"
        placeholder={t('Search')}
        value={searchQuery}
        onChange={handleChange}
        className="rounded-lg border border-gray-300 py-1 pl-8 text-sm transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none md:py-2 md:text-base"
      />
    </div>
  )
}
