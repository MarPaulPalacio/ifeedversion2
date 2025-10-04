import { RiCloseLine } from 'react-icons/ri'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'

function AddIngredientModal({
  ingredients,
  user_id,
  isOpen,
  onClose,
  onResult,
}) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    group: '',
    description: '',
    nutrients: [
      {
        name: '',
        unit: '',
        value: 0,
      },
    ],
  })
  const [localNutrients, setLocalNutrients] = useState([
    {
      name: '',
      unit: '',
      value: 0,
    },
  ])
  const [isDisabled, setIsDisabled] = useState(false)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    // update formData (get name and unit for each nutrient)
    fetchNutrientData()
  }, [])

  const fetchNutrientData = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/nutrient/filtered/${user_id}`
      )
      const fetchedData = res.data.nutrients
      const formattedNutrients = fetchedData.map((nutrient) => {
        return {
          nutrient: nutrient._id,
          name: nutrient.name,
          unit: nutrient.unit,
          value: 0,
        }
      })
      setFormData((prevFormData) => {
        return {
          ...prevFormData,
          nutrients: formattedNutrients,
        }
      })
      setLocalNutrients(formattedNutrients)
    } catch (err) {
      console.log(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsDisabled(true)

    // client-side validation
    if (
      ingredients.some(
        (ingredient) =>
          ingredient.name.toLowerCase() === formData.name.toLowerCase()
      )
    ) {
      setNameError('Name already exists')
      setIsDisabled(false)
      return
    } else {
      setNameError('')
    }
    try {
      const body = { ...formData, source: 'user', user: user_id }
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/ingredient`,
        body
      )
      const ingredientData = res.data.ingredients
      const messageData = res.data.message
      onResult(
        ingredientData,
        messageData,
        messageData === 'success'
          ? 'Successfully updated ingredient'
          : 'Failed to update ingredient'
      )
      // reset form data
      setFormData({
        name: '',
        price: '',
        group: '',
        description: '',
        nutrients: localNutrients,
      })
    } catch (err) {
      console.log(err)
    } finally {
      setIsDisabled(false)
      setNameError('')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleNutrientChange = (index, event) => {
    const { name, value } = event.target
    const updatedNutrients = formData.nutrients.map((nutrient, i) =>
      i === index ? { ...nutrient, [name]: value } : nutrient
    )
    setFormData((prev) => ({ ...prev, nutrients: updatedNutrients }))
  }

  return (
    <dialog
      id="add_ingredient_modal"
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

        <h3 className="text-deepbrown mb-1 text-lg font-bold">
          Add Ingredient
        </h3>
        <p className="mb-4 flex text-sm text-gray-500">
          <Info />
          Enter details for your new feed ingredient.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Description section */}
          <div className="mb-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  required
                  disabled={isDisabled}
                  onChange={handleChange}
                  placeholder="Enter name"
                  className={`input input-bordered w-full rounded-2xl ${nameError ? 'border-red-500' : ''}`}
                />
                {nameError && (
                  <p className="mt-1 text-sm text-red-500" role="alert">
                    {nameError}
                  </p>
                )}
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Price (PHP/kg)</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  pattern="[0-9]*"
                  required
                  disabled={isDisabled}
                  onChange={handleChange}
                  placeholder="Enter price"
                  className="input input-bordered w-full rounded-2xl"
                />
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Available</span>
                </label>
                <select
                  name="available"
                  value={formData.available}
                  disabled={isDisabled}
                  onChange={handleChange}
                  className="select select-bordered w-full rounded-2xl"
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Group</span>
                </label>
                <select
                  name="group"
                  value={formData.group}
                  disabled={isDisabled}
                  onChange={handleChange}
                  className="select select-bordered w-full rounded-2xl"
                >
                  <option value="" disabled>
                    Value
                  </option>
                  <option value="Grass">Grass</option>
                  <option value="Legume">Legume</option>
                  <option value="Agricultural by-products">Agricultural by-products</option>
                  <option value="Industrial by-products">
                    Industrial by-products
                  </option>
                  <option value="Vitamin-Mineral">
                    Vitamin-Mineral
                  </option>
                </select>
              </div>
            </div>
            <div className="form-control w-full md:col-span-2">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                disabled={isDisabled}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter description"
                className="textarea textarea-bordered w-full rounded-xl text-xs"
                rows="1"
              ></textarea>
            </div>
          </div>

          {/* Nutrients table */}
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200">
            <table className="table-zebra table-pin-rows table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="font-semibold">Name</th>
                  <th className="font-semibold">Unit</th>
                  <th className="font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {formData.nutrients.map((nutrient, index) => (
                  <tr key={index}>
                    <td>{nutrient.name}</td>
                    <td>{nutrient.unit}</td>
                    <td>
                      <input
                        type="number"
                        name="value"
                        placeholder="Value"
                        className="input input-bordered input-sm w-full max-w-xs rounded-xl"
                        value={nutrient.value}
                        pattern="[0-9]*"
                        disabled={isDisabled}
                        onChange={(e) => handleNutrientChange(index, e)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal actions */}
          <div className="modal-action">
            <button className="btn rounded-xl px-8" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn bg-green-button ${isDisabled ? 'disabled bg-red-100' : 'hover:bg-green-600'} rounded-xl px-8 text-white`}
            >
              {`${isDisabled ? 'Adding...' : 'Add'}`}
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

export default AddIngredientModal
