import { useState, useCallback } from 'react'
import { debounce } from 'lodash'
import { RiArrowUpDownLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'

export default function SortBy({ handleFilterQuery, options }) {
  const { t } = useTranslation()
  const [sortOption, setSortOption] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const selectOption = (value) => {
    setSortOption(value)
    setIsDropdownOpen(false)
    handleFilterQuery('sort', value)
  }

  // Find the current selected option label
  const currentLabel =
    options.find((option) => option.value === sortOption)?.label || t('Sort')

  return (
    <div className="relative">
      <div className="dropdown dropdown-bottom dropdown-end w-full">
        <div
          tabIndex={0}
          role="button"
          className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-1 text-sm transition-colors hover:border-green-500 focus:border-green-500 md:px-4 md:py-2 md:text-base"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <div className="flex items-center gap-2">
            <RiArrowUpDownLine className="h-4 w-4 md:h-5 md:w-5" />
            <span>{currentLabel}</span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] mt-1 w-full p-2 shadow"
        >
          {options.map((option) => (
            <li key={option.value}>
              <a
                className={`${sortOption === option.value ? 'bg-gray-100 text-green-600' : ''}`}
                onClick={() => selectOption(option.value)}
              >
                {option.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
