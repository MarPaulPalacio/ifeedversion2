import { RiCloseLine, RiImageAddLine, RiDeleteBin7Line } from 'react-icons/ri'
import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'

function EditIngredientModal({
  ingredients,
  user_id,
  isOpen,
  onClose,
  ingredient,
  onResult,
}) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    group: '',
    description: '',
    image: { url: '', public_id: '' },
    nutrients: [],
  })

  const [isDisabled, setIsDisabled] = useState(false)
  const [nameError, setNameError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    if (ingredient) {
      setFormData(ingredient)
      setImagePreview(ingredient.image?.url || null)
      fetchNutrientData(ingredient.nutrients)
    }
  }, [ingredient])

  const fetchNutrientData = async (nutrients) => {
    try {
      const formattedNutrients = await Promise.all(
        nutrients.map(async (nutrient) => {
          const res = await axios.get(
            `${import.meta.env.VITE_API_URL}/nutrient/${nutrient.nutrient}/${user_id}`
          )
          const fetchedData = res.data.nutrients
          return {
            nutrient: fetchedData._id,
            name: fetchedData.name,
            unit: fetchedData.unit,
            value: nutrient.value,
          }
        })
      )
      setFormData((prev) => ({ ...prev, nutrients: formattedNutrients }))
    } catch (err) {
      console.log(err)
    }
  }

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  // Cloudinary Upload Function
  const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; 
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 

    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', uploadPreset)
    data.append('folder', 'iFeed_Ingredients') // Saves to your specific folder

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        data
      )
      return {
        url: res.data.secure_url,
        public_id: res.data.public_id
      }
    } catch (err) {
      console.error("Cloudinary Upload Error:", err)
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsDisabled(true)

    if (ingredients.filter((i) => i.name !== ingredient.name).some((ing) => ing.name.toLowerCase() === formData.name.toLowerCase())) {
      setNameError('Name already exists')
      setIsDisabled(false)
      return
    }

    try {
      let finalImageData = formData.image

      // If a new file was selected, upload it first
      if (selectedFile) {
        const uploadedImage = await uploadToCloudinary(selectedFile)
        if (uploadedImage) {
          finalImageData = uploadedImage
        }
      }

      const { _id, user, ...body } = formData
      const payload = { ...body, image: finalImageData } // Include the new image data
      
      const ingredient_id = ingredient.ingredient_id || ingredient._id
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/ingredient/${ingredient_id}/${user_id}`,
        payload
      )

      onResult(res.data.ingredients, res.data.message, res.data.message === 'success' ? 'Updated successfully' : 'Update failed')
      onClose()
    } catch (err) {
      console.log(err)
    } finally {
      setIsDisabled(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNutrientChange = (index, event) => {
    const { name, value } = event.target
    const updatedNutrients = formData.nutrients.map((n, i) => i === index ? { ...n, [name]: value } : n)
    setFormData((prev) => ({ ...prev, nutrients: updatedNutrients }))
  }

  return (
    <dialog id="edit_ingredient_modal" className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box relative w-11/12 max-w-4xl rounded-3xl bg-white">
        <button className="btn btn-sm btn-circle absolute top-4 right-4" onClick={onClose}>
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown text-lg font-bold">Edit Ingredient</h3>
        <p className="mb-4 flex text-sm text-gray-500"><Info /> Update details and image.</p>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 md:flex-row">
            
            {/* Left Column: Image Upload */}
            <div className="flex flex-col items-center gap-2 md:w-1/3">
              <label className="label-text font-semibold">Ingredient Image</label>
              <div className="relative h-48 w-full overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-gray-400">
                    <RiImageAddLine className="h-10 w-10" />
                    <span className="text-xs">No image uploaded</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
                id="image-upload" 
              />
              <label htmlFor="image-upload" className="btn btn-outline btn-sm mt-2 rounded-xl">
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </label>
            </div>

            {/* Right Column: Form Fields */}
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label-text">Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="input input-bordered rounded-xl" required />
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>
              <div className="form-control">
                <label className="label-text">Price (PHP/kg)</label>
                <input type="text" name="price" value={formData.price} onChange={handleChange} className="input input-bordered rounded-xl" required />
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
                <select name="group" value={formData.group} onChange={handleChange} className="select select-bordered rounded-xl">
                  <option value="Grass">Grass</option>
                  <option value="Legumes">Legumes</option>
                  <option value="Agricultural by-products">Agricultural by-products</option>
                  <option value="Industrial by-products">Industrial by-products</option>
                  <option value="Vitamin-Mineral">Vitamin-Mineral</option>
                </select>
              </div>
              <div className="form-control md:col-span-2">
                <label className="label-text">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered rounded-xl" rows="2"></textarea>
              </div>
            </div>
          </div>

          {/* Nutrients Table */}
          <div className="mt-6 max-h-48 overflow-y-auto rounded-2xl border">
            <table className="table-zebra table w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr><th>Name</th><th>Unit</th><th>Value</th></tr>
              </thead>
              <tbody>
                {formData.nutrients.map((n, index) => (
                  <tr key={index}>
                    <td>{n.name}</td>
                    <td>{n.unit}</td>
                    <td><input type="number" name="value" value={n.value} onChange={(e) => handleNutrientChange(index, e)} className="input input-bordered input-sm w-full rounded-lg" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="modal-action">
            <button type="button" className="btn rounded-xl px-8" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isDisabled} className="btn rounded-xl bg-amber-500 hover:bg-amber-600 px-8 text-white">
              {isDisabled ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

export default EditIngredientModal