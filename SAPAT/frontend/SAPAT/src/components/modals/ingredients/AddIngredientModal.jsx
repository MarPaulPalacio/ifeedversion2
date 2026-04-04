import { RiCloseLine, RiImageAddLine } from 'react-icons/ri'
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
  const initialFormState = {
    name: '',
    price: '',
    available: '1',
    group: '',
    description: '',
    image: { url: '', public_id: '' },
    nutrients: [],
  }

  const [formData, setFormData] = useState(initialFormState)
  const [localNutrients, setLocalNutrients] = useState([])
  const [isDisabled, setIsDisabled] = useState(false)
  const [nameError, setNameError] = useState('')
  
  // Image states
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    fetchNutrientData()
  }, [])

  const fetchNutrientData = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/nutrient/filtered/${user_id}`
      )
      const fetchedData = res.data.nutrients
      const formattedNutrients = fetchedData.map((nutrient) => ({
        nutrient: nutrient._id,
        name: nutrient.name,
        unit: nutrient.unit,
        value: 0,
      }))
      setFormData((prev) => ({ ...prev, nutrients: formattedNutrients }))
      setLocalNutrients(formattedNutrients)
    } catch (err) {
      console.log(err)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', uploadPreset)
    data.append('folder', 'iFeed_Ingredients')

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        data
      )
      return { url: res.data.secure_url, public_id: res.data.public_id }
    } catch (err) {
      console.error("Cloudinary Error:", err)
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsDisabled(true)

    if (ingredients.some(ing => ing.name.toLowerCase() === formData.name.toLowerCase())) {
      setNameError('Name already exists')
      setIsDisabled(false)
      return
    }

    try {
      let finalImageData = { url: '', public_id: '' }

      if (selectedFile) {
        const uploaded = await uploadToCloudinary(selectedFile)
        if (uploaded) finalImageData = uploaded
      }

      const body = { 
        ...formData, 
        image: finalImageData, 
        source: 'user', 
        user: user_id 
      }

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/ingredient`, body)
      
      onResult(
        res.data.ingredients,
        res.data.message,
        res.data.message === 'success' ? 'Successfully added ingredient' : 'Failed to add'
      )

      // Reset Form
      setFormData({ ...initialFormState, nutrients: localNutrients })
      setSelectedFile(null)
      setImagePreview(null)
      onClose()
    } catch (err) {
      console.log(err)
    } finally {
      setIsDisabled(false)
      setNameError('')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNutrientChange = (index, event) => {
    const { value } = event.target
    const updatedNutrients = formData.nutrients.map((n, i) =>
      i === index ? { ...n, value: value } : n
    )
    setFormData((prev) => ({ ...prev, nutrients: updatedNutrients }))
  }

  return (
    <dialog id="add_ingredient_modal" className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box relative w-11/12 max-w-4xl rounded-3xl bg-white">
        <button type="button" className="btn btn-sm btn-circle absolute top-4 right-4" onClick={onClose}>
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown text-lg font-bold">Add New Ingredient</h3>
        <p className="mb-4 flex text-sm text-gray-500"><Info /> Fill out the details below.</p>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 md:flex-row">
            
            {/* Image Upload Area */}
            <div className="flex flex-col items-center gap-2 md:w-1/3">
              <div className="relative h-48 w-full overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-gray-400">
                    <RiImageAddLine className="h-10 w-10" />
                    <span className="text-xs">Select Ingredient Image</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="add-image-upload" />
              <label htmlFor="add-image-upload" className="btn btn-outline btn-sm mt-2 rounded-xl">
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </label>
            </div>

            {/* Fields Area */}
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label-text">Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="input input-bordered rounded-xl" required />
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>
              <div className="form-control">
                <label className="label-text">Price (PHP/kg)</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} className="input input-bordered rounded-xl" required />
              </div>
              <div className="form-control">
                <label className="label-text">Available</label>
                <select name="available" value={formData.available} onChange={handleChange} className="select select-bordered rounded-xl">
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label-text">Group</label>
                <select name="group" value={formData.group} onChange={handleChange} className="select select-bordered rounded-xl" required>
                  <option value="" disabled>Select Group</option>
                  <option value="Grass">Grass</option>
                  <option value="Legume">Legume</option>
                  <option value="Agricultural by-products">Agricultural by-products</option>
                  <option value="Industrial by-products">Industrial by-products</option>
                  <option value="Vitamin-Mineral">Vitamin-Mineral</option>
                </select>
              </div>
              <div className="form-control md:col-span-2">
                <label className="label-text">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered rounded-xl" rows="1"></textarea>
              </div>
            </div>
          </div>

          {/* Nutrient Table Area */}
            <div className="mt-6 max-h-48 overflow-y-auto rounded-2xl border border-gray-100 shadow-inner">
              {/* 'table-xs' shrinks text and padding for small screens, 'md:table-sm' for desktop */}
              <table className="table table-xs md:table-sm table-pin-rows table-zebra w-full">
                <thead className="bg-gray-50">
                  <tr className="text-deepbrown">
                    <th className="py-2">Nutrient</th>
                    <th className="py-2">Unit</th>
                    <th className="py-2 w-24">Value</th> {/* Set a width for the input column */}
                  </tr>
                </thead>
                <tbody>
                  {formData.nutrients.map((n, index) => (
                    <tr key={index}>
                      <td className="font-medium text-[11px] md:text-sm">{n.name}</td>
                      <td className="text-[10px] md:text-xs text-gray-500">{n.unit}</td>
                      <td className="py-1">
                        <input 
                          type="number" 
                          step="any"
                          value={n.value} 
                          onChange={(e) => handleNutrientChange(index, e)} 
                          // Smaller input height and text for mobile
                          className="input input-bordered input-xs md:input-sm w-full rounded-lg h-7 md:h-8" 
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          <div className="modal-action">
            <button type="button" className="btn rounded-xl px-8" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isDisabled} className="btn rounded-xl bg-green-600 hover:bg-green-700 px-8 text-white">
              {isDisabled ? 'Adding...' : 'Add Ingredient'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

export default AddIngredientModal