import { RiCloseLine, RiSearchLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'

function ChooseIngredientsModal({ isOpen, onClose, ingredients, onResult, ingredientsFilter }) {
  const [checkedIngredients, setCheckedIngredients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredIngredients, setFilteredIngredients] = useState(ingredients)
  const [groupFilter, setGroupFilter] = useState([])
  // Update filtered ingredients whenever search term or ingredients list changes
  
  const ingredientFilterMachine = () => {
    console.log("INGREDIENTSsasd:", ingredients)
    let filtered = []
    if (groupFilter.length === 0) {
      filtered = ingredients
      console.log("NO FILTER")
    } else {
      filtered = ingredients.filter(
        (ingredient) =>
          
          groupFilter.some((g) => ingredient.group?.toLowerCase().includes(g.toLowerCase()))
      )
    }

    
    

    if (!searchTerm.trim()) {
      setFilteredIngredients(filtered)
    } else {
      const term = searchTerm.toLowerCase().trim()
      const filtered = filtered.filter(
        (ingredient) =>
          ingredient.name.toLowerCase().includes(term) ||
          (ingredient.group && ingredient.group.toLowerCase().includes(term))
      )
      setFilteredIngredients(filtered)
      
    }
  }
  useEffect(() => {
    ingredientFilterMachine()
  }, [searchTerm, ingredients, groupFilter])


  useEffect(() => {
    if(ingredientsFilter === "roughage"){
      setGroupFilter(["Grass", "Legumes"])
    } else if(ingredientsFilter === "concentrate"){
      setGroupFilter(["Agricultural by-products", "Industrial by-products"])
    } else if (ingredientsFilter === "vitamins") {
      setGroupFilter(["Vitamin-Mineral"])
    } else {
      setGroupFilter([])
    }
    

  },[isOpen, onClose])

  

  const handleSubmit = (e) => {
    e.preventDefault()
    setCheckedIngredients([])
    onResult(checkedIngredients)
  }

  const handleRowClick = (ingredient) => {
    const id = ingredient.ingredient_id ?? ingredient._id
    const isChecked = checkedIngredients.some(
      (item) => item.ingredient_id === id
    )
    if (isChecked) {
      setCheckedIngredients(
        checkedIngredients.filter((item) => item.ingredient_id !== id)
      )
    } else {
      setCheckedIngredients([
        ...checkedIngredients,
        { ingredient_id: id, name: ingredient.name },
      ])
    }
  }

  const handleCheckboxChange = (ingredient, e) => {
    e.stopPropagation() // Prevent row click from firing
    const id = ingredient.ingredient_id ?? ingredient._id
    if (e.target.checked) {
      setCheckedIngredients([
        ...checkedIngredients,
        { ingredient_id: id, name: ingredient.name },
      ])
    } else {
      setCheckedIngredients(
        checkedIngredients.filter((item) => item.ingredient_id !== id)
      )
    }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const isAllChecked =
    filteredIngredients.length > 0 &&
    filteredIngredients.every((ingredient) => {
      const id = ingredient.ingredient_id ?? ingredient._id
      return checkedIngredients.some((item) => item.ingredient_id === id)
    })

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Add all filtered ingredients that aren't already checked
      const newChecked = [...checkedIngredients]
      filteredIngredients.forEach((ingredient) => {
        const id = ingredient.ingredient_id ?? ingredient._id
        if (!newChecked.some((item) => item.ingredient_id === id)) {
          newChecked.push({ ingredient_id: id, name: ingredient.name })
        }
      })
      setCheckedIngredients(newChecked)
    } else {
      // Remove all filtered ingredients from checked list
      const newChecked = checkedIngredients.filter((checkedItem) => {
        return !filteredIngredients.some((ingredient) => {
          const id = ingredient.ingredient_id ?? ingredient._id
          return checkedItem.ingredient_id === id
        })
      })
      setCheckedIngredients(newChecked)
    }
  }

  return (
    <dialog
      id="choose_ingredients_modal"
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
          Choose Ingredient
        </h3>
        <p className="mb-4 text-sm text-gray-500">Description</p>

        {/* Search input */}
        <div className="relative mb-4">
          <div className="relative">
            <RiSearchLine className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search ingredients..."
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

        {/* Ingredients table */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-64 overflow-hidden overflow-y-auto rounded-2xl border border-gray-200">
            <table className="table-pin-rows table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={isAllChecked && filteredIngredients.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="font-semibold">Name</th>
                  <th className="font-semibold">Price</th>
                  <th className="font-semibold">Available</th>
                  <th className="font-semibold">Group</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.length > 0 ? (
                  filteredIngredients.map((ingredient, index) => (
                    <tr
                      key={index}
                      className={`hover cursor-pointer ${
                        checkedIngredients.some((item) =>
                          ingredient.ingredient_id
                            ? item.ingredient_id === ingredient.ingredient_id
                            : item.ingredient_id === ingredient._id
                        )
                          ? 'bg-blue-100'
                          : ''
                      }`}
                      onClick={() => handleRowClick(ingredient)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checkedIngredients.some((item) =>
                            ingredient.ingredient_id
                              ? item.ingredient_id === ingredient.ingredient_id
                              : item.ingredient_id === ingredient._id
                          )}
                          onChange={(e) => handleCheckboxChange(ingredient, e)}
                        />
                      </td>
                      <td>{ingredient.name}</td>
                      <td>{ingredient.price}</td>
                      <td>{ingredient.available}</td>
                      <td>{ingredient.group}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center">
                      No ingredients found. Try another search term.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Selected count */}
          <div className="mt-4 text-sm text-gray-600">
            {checkedIngredients.length > 0 && (
              <span>
                {checkedIngredients.length} ingredient
                {checkedIngredients.length > 1 ? 's' : ''} selected
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
              className="btn bg-green-button rounded-xl px-8 text-white hover:bg-green-600"
              disabled={checkedIngredients.length === 0}
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

export default ChooseIngredientsModal
