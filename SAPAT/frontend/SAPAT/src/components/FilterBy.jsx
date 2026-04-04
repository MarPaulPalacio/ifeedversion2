import { useState, useCallback, useEffect } from 'react'
import { debounce } from 'lodash'
import { RiFilterLine } from 'react-icons/ri'

export default function FilterBy({ handleFilterQuery, options = [] }) {
  const [selectedFilters, setSelectedFilters] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const applyFilters = useCallback(
    debounce((values) => {
      handleFilterQuery('filter', values.join(','))
    }, 300),
    []
  )
  
  const toggleFilter = (value) => {
    setSelectedFilters((prevFilters) => {
      let newFilters = [...prevFilters]

      if (newFilters.includes(value)) {
        newFilters = newFilters.filter((v) => v !== value)
      } else {
        newFilters.push(value)
      }

      return newFilters
    })
  }
  // Apply filters whenever selectedFilters changes
  useEffect(() => {
    applyFilters(selectedFilters)
  }, [selectedFilters])

  const clearAllFilters = () => {
    setSelectedFilters([])
  }

  const isFilterActive = (value) => {
    return selectedFilters.includes(value)
  }

  // If options array is empty, don't show anything
  if (options.length === 0) {
    return null
  }

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
            <RiFilterLine className="h-4 w-4 md:h-5 md:w-5" />
            <span>
              {selectedFilters.length > 0
                ? `Filters (${selectedFilters.length})`
                : 'Filter'}
            </span>
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
        <div
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] mt-1 w-52 shadow"
        >
          <div className="p-2">
            <div className="space-y-2">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 hover:text-green-600"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-success"
                    checked={isFilterActive(option.value)}
                    onChange={() => toggleFilter(option.value)}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>

            {selectedFilters.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
