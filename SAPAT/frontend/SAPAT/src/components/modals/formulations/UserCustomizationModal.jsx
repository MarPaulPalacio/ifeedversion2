import { RiCloseLine } from 'react-icons/ri'
import { useState } from 'react'
import Info from '../../icons/Info.jsx'
import {RiArrowRightSLine} from 'react-icons/ri'

function ReportGenerationModal({ isOpen, onClose, onGenerate, userAccess, formulation, owner, weight, shadowPrices, isCustomizationModalOpen, setIsCustomizationModalOpen }) {
  const [formData, setFormData] = useState({
    showEmptyValues: false,
    additionalCosts: [],
    ingredientSorting: 'alphabetical',
    remarks: '',
    roundingPrecision: 2,
  })
  const [newCostName, setNewCostName] = useState('')
  const [newCostValue, setNewCostValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsGenerating(true)

    try {
      console.log("FoRMAS DFS", formData)
      console.log("Form Data on submit weight:", weight)
      await onGenerate(formData, formulation, owner, shadowPrices, weight)
      setError('')
      onClose() // Close the modal after successful generation
    } catch (err) {
      console.log(err)
      setError('Failed to generate PDF report.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleAddCost = () => {
    if (!newCostName.trim() || isNaN(parseFloat(newCostValue))) {
      setError('Please enter a valid name and cost value')
      return
    }

    setFormData((prev) => ({
      ...prev,
      additionalCosts: [
        ...prev.additionalCosts,
        {
          name: newCostName.trim(),
          value: parseFloat(newCostValue),
        },
      ],
    }))
    setNewCostName('')
    setNewCostValue('')
    setError('')
  }

  const handleRemoveCost = (index) => {
    setFormData((prev) => ({
      ...prev,
      additionalCosts: prev.additionalCosts.filter((_, i) => i !== index),
    }))
  }

  const handleClose = () => {
    // Reset form when closing without generating
    setFormData({
      showEmptyValues: false,
      additionalCosts: [],
      ingredientSorting: 'alphabetical',
      remarks: '',
      roundingPrecision: 2,
    })
    setNewCostName('')
    setNewCostValue('')
    setError('')
    onClose()
  }

return (
    <dialog
      id="report_generation_modal"
      className={`modal ${isOpen ? 'modal-open' : ''} z-[9999]`}
    >
      <div className="modal-box relative w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-4 md:p-8 no-scrollbar ">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle absolute top-4 right-2 md:right-4 z-10"
          onClick={handleClose}
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-1 text-base md:text-lg font-bold">
          Feed Formulation
        </h3>

        {/* COMPACT STEP PROGRESS */}
        <div className="flex flex-row items-center gap-2 mb-4 overflow-x-auto no-scrollbar border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1 opacity-50 shrink-0">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-tighter">Select</span>
            <RiArrowRightSLine className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-1 opacity-50 shrink-0">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-tighter">Formulate</span>
            <RiArrowRightSLine className="h-3 w-3" />
          </div>
          <div className="flex flex-col items-start shrink-0">
            <span className="text-deepbrown text-[10px] md:text-xs font-bold uppercase tracking-tighter">Generate</span>
            <div className="h-1 w-full bg-deepbrown rounded-full mt-0.5 animate-pulse" />
          </div>
        </div>

        <p className="mb-4 flex gap-2 text-[11px] md:text-sm text-gray-500 italic">
          <Info className="w-4 h-4 shrink-0" />
          Customize PDF report appearance.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Settings Grid - 2 cols even on mobile to save height */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-[10px] font-bold uppercase text-gray-400">Sorting</span>
              </label>
              <select
                name="ingredientSorting"
                value={formData.ingredientSorting}
                onChange={handleChange}
                className="select select-bordered select-sm w-full rounded-xl text-xs"
                disabled={isGenerating}
              >
                <option value="alphabetical">A-Z</option>
                <option value="valueHighToLow">High-Low</option>
                <option value="valueLowToHigh">Low-High</option>
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-[10px] font-bold uppercase text-gray-400">Rounding</span>
              </label>
              <select
                name="roundingPrecision"
                value={formData.roundingPrecision}
                onChange={handleChange}
                className="select select-bordered select-sm w-full rounded-xl text-xs"
                disabled={isGenerating}
              >
                <option value="0">0 dec</option>
                <option value="1">1 dec</option>
                <option value="2">2 dec</option>
              </select>
            </div>
          </div>

          {/* Additional Costs - Compact Input Group */}
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <h4 className="text-[11px] font-bold uppercase text-gray-500 mb-2">Extra Costs</h4>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newCostName}
                onChange={(e) => setNewCostName(e.target.value)}
                placeholder="Name (e.g. Labor)"
                className="input input-bordered input-sm w-full rounded-lg text-xs"
                disabled={isGenerating}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newCostValue}
                  onChange={(e) => setNewCostValue(e.target.value)}
                  placeholder="PHP"
                  className="input input-bordered input-sm flex-1 rounded-lg text-xs"
                  disabled={isGenerating}
                />
                <button
                  type="button"
                  onClick={handleAddCost}
                  className="btn btn-sm bg-green-button text-white rounded-lg px-4"
                  disabled={isGenerating}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Scrollable list for costs */}
            {formData.additionalCosts.length > 0 && (
              <ul className="mt-3 space-y-1 max-h-24 overflow-y-auto pt-2 border-t border-gray-200 no-scrollbar">
                {formData.additionalCosts.map((cost, index) => (
                  <li key={index} className="flex justify-between items-center text-[11px] bg-white p-2 rounded shadow-sm">
                    <span className="truncate max-w-[120px] font-medium">{cost.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">₱{cost.value.toFixed(2)}</span>
                      <button 
                        onClick={() => handleRemoveCost(index)} 
                        className="text-red-500 font-bold"
                      >✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Remarks - Shorter textarea for mobile */}
          <div className="form-control w-full">
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Report remarks..."
              className="textarea textarea-bordered w-full rounded-xl text-xs"
              rows="2"
              disabled={isGenerating}
            ></textarea>
          </div>

          {/* Checkbox */}
          <div className="form-control">
            <label className="cursor-pointer label justify-start gap-2 p-0">
              <input
                type="checkbox"
                name="showEmptyValues"
                checked={formData.showEmptyValues}
                onChange={handleChange}
                className="checkbox checkbox-xs"
              />
              <span className="label-text text-[11px]">Include zero-value items</span>
            </label>
          </div>

          {error && <p className="text-[10px] text-red-500">{error}</p>}

          {/* Actions - Flex-row to keep buttons side-by-side */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="btn btn-sm flex-1 rounded-xl"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn-sm flex-[2] bg-green-button text-white rounded-xl ${isGenerating ? 'loading' : ''}`}
              disabled={isGenerating}
            >
              {isGenerating ? '' : 'Generate PDF'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/30 backdrop-blur-[2px]">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  )
}

export default ReportGenerationModal