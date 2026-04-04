import { RiCloseLine, RiSearchLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'

function ChooseNutrientsModal({ isOpen, onClose, nutrients, onResult }) {
  const [checkedNutrients, setCheckedNutrients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredNutrients, setFilteredNutrients] = useState(nutrients)

  // Update filtered nutrients whenever search term or nutrients list changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredNutrients(nutrients)
    } else {
      const term = searchTerm.toLowerCase().trim()
      const filtered = nutrients.filter(
        (nutrient) =>
          nutrient.name.toLowerCase().includes(term) ||
          (nutrient.abbreviation &&
            nutrient.abbreviation.toLowerCase().includes(term)) ||
          (nutrient.group && nutrient.group.toLowerCase().includes(term))
      )
      setFilteredNutrients(filtered)
    }
  }, [searchTerm, nutrients])

  const handleSubmit = (e) => {
    e.preventDefault()
    setCheckedNutrients([])
    onResult(checkedNutrients)
  }

  const handleRowClick = (nutrient) => {
    const id = nutrient.nutrient_id ?? nutrient._id
    const isChecked = checkedNutrients.some((item) => item.nutrient_id === id)
    if (isChecked) {
      setCheckedNutrients(
        checkedNutrients.filter((item) => item.nutrient_id !== id)
      )
    } else {
      setCheckedNutrients([
        ...checkedNutrients,
        { nutrient_id: id, name: nutrient.name },
      ])
    }
  }

  const handleCheckboxChange = (nutrient, e) => {
    e.stopPropagation() // Prevent row click from firing
    const id = nutrient.nutrient_id ?? nutrient._id
    if (e.target.checked) {
      setCheckedNutrients([
        ...checkedNutrients,
        { nutrient_id: id, name: nutrient.name },
      ])
    } else {
      setCheckedNutrients(
        checkedNutrients.filter((item) => item.nutrient_id !== id)
      )
    }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const isAllChecked =
    filteredNutrients.length > 0 &&
    filteredNutrients.every((nutrient) => {
      const id = nutrient.nutrient_id ?? nutrient._id
      return checkedNutrients.some((item) => item.nutrient_id === id)
    })

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Add all filtered nutrients that aren't already checked
      const newChecked = [...checkedNutrients]
      filteredNutrients.forEach((nutrient) => {
        const id = nutrient.nutrient_id ?? nutrient._id
        if (!newChecked.some((item) => item.nutrient_id === id)) {
          newChecked.push({ nutrient_id: id, name: nutrient.name })
        }
      })
      setCheckedNutrients(newChecked)
    } else {
      // Remove all filtered nutrients from checked list
      const newChecked = checkedNutrients.filter((checkedItem) => {
        return !filteredNutrients.some((nutrient) => {
          const id = nutrient.nutrient_id ?? nutrient._id
          return checkedItem.nutrient_id === id
        })
      })
      setCheckedNutrients(newChecked)
    }
  }

  return (
    <dialog
      id="choose_nutrients_modal"
      className={`modal ${isOpen ? 'modal-open' : ''}`}
    >
      <div className="modal-box relative mt-[64px] w-11/12 max-w-3xl rounded-3xl bg-white md:mt-0">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle absolute top-4 right-4"
          onClick={onClose}
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-4 text-lg font-bold">
          Choose Nutrients
        </h3>
        <p className="mb-4 text-sm text-gray-500">Description</p>

        {/* Search input */}
        <div className="relative mb-4">
          <div className="relative">
            <RiSearchLine className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search nutrients..."
              className="input input-bordered w-full rounded-xl pl-10"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && (
              <button
                className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                onClick={() => setSearchTerm('')}
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Nutrients table */}
        <form onSubmit={handleSubmit}>
          {/* Changed max-height to 40vh for mobile, 64 for desktop */}
          <div className="max-h-[40vh] md:max-h-64 overflow-y-auto rounded-2xl border border-gray-200">
            <table className="table-pin-rows table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={isAllChecked && filteredNutrients.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  {/* HIDDEN ON MOBILE */}
                  <th className="font-semibold hidden sm:table-cell text-deepbrown">Abbreviation</th>
                  <th className="font-semibold text-deepbrown">Name</th>
                  <th className="font-semibold text-deepbrown">Unit</th>
                  {/* HIDDEN ON MOBILE */}
                  <th className="font-semibold hidden md:table-cell text-deepbrown">Group</th>
                </tr>
              </thead>
              <tbody>
                {filteredNutrients.length > 0 ? (
                  filteredNutrients.map((nutrient, index) => (
                    <tr
                      key={index}
                      className={`hover cursor-pointer ${
                        checkedNutrients.some((item) =>
                          nutrient.nutrient_id
                            ? item.nutrient_id === nutrient.nutrient_id
                            : item.nutrient_id === nutrient._id
                        )
                          ? 'bg-blue-100'
                          : ''
                      }`}
                      onClick={() => handleRowClick(nutrient)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checkedNutrients.some((item) =>
                            nutrient.nutrient_id
                              ? item.nutrient_id === nutrient.nutrient_id
                              : item.nutrient_id === nutrient._id
                          )}
                          onChange={(e) => handleCheckboxChange(nutrient, e)}
                        />
                      </td>
                      {/* HIDDEN ON MOBILE */}
                      <td className="hidden sm:table-cell">{nutrient.abbreviation}</td>
                      {/* TRUNCATED ON MOBILE TO PREVENT OVERFLOW */}
                      <td className="max-w-[120px] md:max-w-none truncate">{nutrient.name}</td>
                      <td>{nutrient.unit}</td>
                      {/* HIDDEN ON MOBILE */}
                      <td className="hidden md:table-cell">{nutrient.group}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center">
                      No nutrients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Selected count */}
          <div className="mt-4 text-sm text-gray-600">
            {checkedNutrients.length > 0 && (
              <span>
                {checkedNutrients.length} nutrient
                {checkedNutrients.length > 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          {/* Modal actions */}
          <div className="modal-action">
            <button
              type="button"
              className="btn rounded-xl px-8"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn bg-green-button rounded-xl px-8 text-white hover:bg-green-600 border-none"
              disabled={checkedNutrients.length === 0}
            >
              Add
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  )

}

export default ChooseNutrientsModal
