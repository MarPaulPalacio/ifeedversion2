import { RiCloseLine } from 'react-icons/ri'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'

function EditFormulationModal({
  formulations,
  isOpen,
  onClose,
  formulation,
  onResult,
}) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    animal_group: '',
    is_lactating: '',
    is_pregnant: false,
    body_weight: '',
    average_daily_gain: '',
    milk_price: '',
    milk_yield: '',
    fat_content: '',
    months_pregnant: 0,
    milkYieldProgress: [],

  })

  const [isDisabled, setIsDisabled] = useState(false)
  const [nameError, setNameError] = useState('')
  const [codeError, setCodeError] = useState('')
  // ... other error states kept for your logic consistency
  const [bodyWeightError] = useState('')
  const [averageDailyGainError] = useState('')
  const [milkYieldError] = useState('')
  const [fatProteinContentError] = useState('')
  const [milkPriceError] = useState('')
  const [monthsPregnantError] = useState('')

  useEffect(() => {
    if (formulation) {
      setFormData(formulation)
    }
  }, [formulation])

  useEffect(() => {
    console.log("FORMULATION USED HERE FOR EDITING", formulation)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsDisabled(true)

    if (formulations && formulations.length > 0) {
      const isDuplicate = formulations
        .filter((f) => f.name !== formulation.name)
        .some((f) => f.name.toLowerCase() === formData.name.toLowerCase())

      if (isDuplicate) {
        setNameError('Name already exists')
        setIsDisabled(false)
        return
      }
    }

    setNameError('')

    try {
      let bodynutrient_constraints = []
      let nutrients = []
      let dmintake = 0;

      // Helper functions retained from your original logic
      const nutrientsToConstraintFormat = (bnc, data, dmNutrient, drymatterintake) => {
  // 1. First, map the existing nutrients to the constraint format
  const nutrients = bnc.map((nc) => {
    const constraint_percent = 0.2
    let min = nc.constraintvalue - nc.constraintvalue * constraint_percent
    let max = nc.constraintvalue + nc.constraintvalue * constraint_percent

    if (data.animal_group === 'Cow | Inahing kalabaw') {
      if (data.months_pregnant >= 7) { min *= 1.3; max *= 1.3 }
      if (nc.name === 'Total Digestible Nutrients' && data.is_pregnant) { min *= 1.25; max *= 1.25 }
      if (nc.name === 'Crude Protein' && data.is_pregnant) { min *= 1.5; max *= 1.5 }
      if (nc.is_lactating === 'Early Lactation (1-100 Days)') { min *= 1.25; max *= 1.25 }

    } else if (data.animal_group === 'Heifer | Dumalaga') {
      if (data.months_pregnant && data.months_pregnant >= 7) {
        min *= 1.30;
        max *= 1.30;
      }
      if (nc.name === 'Total Digestible Nutrients' && data.months_pregnant !== "Not Pregnant") {
        min = min * 1.25;
        max = max * 1.25;
      }
      if (nc.name === 'Crude Protein' && data.months_pregnant !== "Not Pregnant") {
        min = min * 1.50;
        max = max * 1.50;
      }
    }

    return {
      nutrient_id: nc.nutrientid,
      _id: nc._id,
      name: nc.name,
      minimum: min,
      maximum: max,
      value: nc.value || 0,
      unit: nc.unit || '%' // Added to maintain consistency
    }
  })

  // 2. Now, apply your Dry Matter check logic
  const nutrientWithDryMatter = nutrients.find(n => n.name === 'Dry Matter')
    ? nutrients
    : [
        ...nutrients,
        {
          nutrient_id: dmNutrient._id,
          _id: dmNutrient._id,
          name: 'Dry Matter',
          minimum: drymatterintake * 0.8 * 1000,
          maximum: drymatterintake * 1.2 * 1000,
          value: 0,
          unit: '%'
        }
      ];

  return nutrientWithDryMatter;
}

      const cowWeight = (weight) => {
        const weights = [350, 400, 450, 500, 550, 600, 650, 700, 750, 800]
        if (weight < 350) return 350
        if (weight > 800) return 800
        return weights.reduce((prev, curr) => Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev)
      }

      function regularBuffaloWeight(weight) {
        const weights = [100,150,200,250,300,350, 400, 450];
        if (weight < 100) return 100;
        if (weight > 450) return 450;
        return weights.reduce((prev, curr) => Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev);
      }

      function seniorBull(weight){
        const weights = [350, 400, 450, 500, 550, 600, 650, 700, 750, 800];
        if (weight < 350) return 350;
        if (weight > 800) return 800;
        return weights.reduce((prev, curr) => Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev);
      }

      if (formData.animal_group === 'Cow | Inahing kalabaw' && formData.body_weight) {
  // --- COW LOGIC ---
  const res = await axios.get(`${import.meta.env.VITE_API_URL}/formulation/cow`, {
    params: { weight: cowWeight(formData.body_weight) },
  });

  bodynutrient_constraints = res.data.formulation.nutrientrequirement;
  
  // Calculate intake
  const drymatterintake = res.data.formulation.intake ? (res.data.formulation.intake * formData.body_weight) : 0;
  
  // Fetch DM Nutrient details from database
  const nutrientRes = await axios.get(`${import.meta.env.VITE_API_URL}/nutrient/filtered/1234567890`); // Replace with actual ownerId or relevant identifier
  const dmNutrient = nutrientRes.data.nutrients.find(n => n.name === 'Dry Matter' || n.abbreviation === 'DM');

  // Format with constraints
  nutrients = nutrientsToConstraintFormat(bodynutrient_constraints, formData, dmNutrient, drymatterintake);

} else {
        let res = null;
        if (formData.animal_group === 'Senior Bull | Bulugan (> 3 taon)' && formData.body_weight){
          res = await axios.get(`${import.meta.env.VITE_API_URL}/formulation/seniorbull`, {
            params: { weight: seniorBull(formData.body_weight)},
          })
        } else {
          res = await axios.get(`${import.meta.env.VITE_API_URL}/formulation/carabao`, {
          params: { weight: regularBuffaloWeight(formData.body_weight), adg: formData.average_daily_gain, lactating: formData.is_lactating},
          });
        }
        
        console.log("Carabao Formulation Response:", res.data.formulation)
        bodynutrient_constraints = res.data.formulation.nutrientrequirement;

        const drymatterintake = res.data.formulation.intake ? (res.data.formulation.intake*formData.body_weight) : 0;
        
        dmintake = res.data.formulation.intake ? (res.data.formulation.intake*formData.body_weight) : 0;

        const nutrientRes = await axios.get(`${import.meta.env.VITE_API_URL}/nutrient/filtered/${ownerId}`);
       
        const dmNutrient = nutrientRes.data.nutrients.find(n => n.name === 'Dry Matter' || n.abbreviation === 'DM');

        nutrients = nutrientsToConstraintFormat(bodynutrient_constraints, formData, drymatterintake, dmNutrient);

      }

      const body = { ...formData, bodynutrient_constraints, nutrients }
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/formulation/${formulation._id}`, body)

      onResult(
        res.data.formulations,
        res.data.message,
        res.data.message === 'success' ? 'Successfully updated formulation.' : 'Failed to update formulation.'
      )
    } catch (err) {
      console.log(err)
    } finally {
      setIsDisabled(false)
      // Resetting exactly as your original code did
      setFormData({
        code: '', name: '', description: '', animal_group: '', is_lactating: '',
        is_pregnant: false, weight: '', average_daily_gain: '', milk_price: '',
        milk_yield: '', fat_content: '', months_pregnant: 0, body_weight: 0, pregnant_phase:0
      })
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckBoxChange = (e) => {
    const { name, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  return (
    <dialog id="edit_formulation_modal" className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box relative w-11/12 max-w-4xl rounded-3xl bg-white p-0 overflow-hidden">
        
        {/* Header - Fixed to reduce vertical jumping */}
        <div className="p-6 pb-2">
          <button className="btn btn-sm btn-circle absolute top-4 right-4" onClick={onClose}>
            <RiCloseLine className="h-5 w-5" />
          </button>
          <h3 className="text-[#4A3728] mb-1 text-lg font-bold">Update Formulation</h3>
          <p className="flex text-sm text-gray-500 items-center gap-1">
            <Info /> Modify basic details of your feed formulation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
          {/* Scrollable middle section to keep modal small on big screens */}
          <div className="overflow-y-auto p-6 pt-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Code</span></label>
                <input type="text" name="code" value={formData.code} required disabled={isDisabled} onChange={handleChange} className={`input input-bordered w-full rounded-xl ${codeError ? 'border-red-500' : ''}`} />
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Name</span></label>
                <input type="text" name="name" value={formData.name} required disabled={isDisabled} onChange={handleChange} className={`input input-bordered w-full rounded-xl ${nameError ? 'border-red-500' : ''}`} />
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Animal Group</span></label>
                <select name="animal_group" value={formData.animal_group} required disabled={isDisabled} onChange={handleChange} className="select select-bordered w-full rounded-xl">
                  <option value="Heifer | Dumalaga">Heifer | Dumalaga</option>
                  <option value="Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)">Calf (0-4 months)</option>
                  <option value="Growing Calves (5-12 months) | Lumalaking bula">Growing Calves</option>
                  <option value="Junior Bull | Lumalaking bulugan">Junior Bull</option>
                  <option value="Cow | Inahing kalabaw">Cow | Inahing kalabaw</option>
                  <option value="Senior Bull | Bulugan (> 3 taon)">Senior Bull</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Body Weight (kg)</span></label>
                <input type="number" name="body_weight" value={formData.body_weight} required disabled={isDisabled} onChange={handleChange} className={`input input-bordered w-full rounded-xl ${bodyWeightError ? 'border-red-500' : ''}`} />
              </div>

              {(formData.animal_group !== "Cow | Inahing kalabaw") && (formData.animal_group !== "Senior Bull | Bulugan (> 3 taon)") && (
                <div className="form-control w-full">
                  <label className="label whitespace-normal">
                  <span className="label-text font-medium">Average Daily Gain (in kg)</span>
                </label>
                <select
                  name="average_daily_gain"
                  value={formData.average_daily_gain}
                  required
                  disabled={isDisabled}
                  onChange={handleChange}
                  className={`select select-bordered w-full rounded-xl ${averageDailyGainError ? 'border-red-500' : ''}`}
                >
                  <option value="" disabled>Select Average Daily Gain</option>
                  <option value="0">0 kg (Maintenance)</option>
                  <option value="0.25">0.25 kg</option>
                  <option value="0.5">0.50 kg</option>
                  <option value="0.75">0.75 kg</option>
                  <option value="1">1 kg</option>
                </select>
                </div>
              )}

              {formData.animal_group === 'Cow | Inahing kalabaw' && (
                <div className="form-control w-full">
                  <label className="label"><span className="label-text">Lactation Stage</span></label>
                  <select name="is_lactating" value={formData.is_lactating} onChange={handleChange} className="select select-bordered w-full rounded-xl">
                    <option value="Not Lactating">Dry (Not Lactating)</option>
                    <option value="Early Lactation (1-100 Days)">Early (1-100 Days)</option>
                    <option value="Mid Lactation (101-200 Days)">Mid (101-200 Days)</option>
                    <option value="Late Lactation (201-305 Days)">Late (201-305 Days)</option>
                  </select>
                </div>
              )}

              {(formData.animal_group === 'Cow | Inahing kalabaw' || formData.animal_group === 'Heifer | Dumalaga') && (
                <div className="form-control w-full flex flex-row items-center gap-3 pt-8">
                  <input type="checkbox" name="is_pregnant" checked={formData.is_pregnant} onChange={handleCheckBoxChange} className="checkbox checkbox-warning" />
                  <label className="label p-0"><span className="label-text">Pregnant?</span></label>
                  {formData.is_pregnant && (
                    <input type="number" name="pregnant_phase" value={formData.pregnant_phase} onChange={handleChange} className="input input-bordered input-sm w-20 rounded-lg" placeholder="Mo." />
                  )}
                </div>
              )}

              {formData.animal_group === "Cow | Inahing kalabaw" && (
                <>
                  <div className="form-control w-full">
                    <label className="label"><span className="label-text">Milk Yield (kg)</span></label>
                    <input type="number" name="milkYieldProgress" value={formData.milkYieldProgress[formData.milkYieldProgress.length-1]} onChange={handleChange} className="input input-bordered w-full rounded-xl" />
                  </div>
                  <div className="form-control w-full">
                    <label className="label"><span className="label-text">Fat/Protein %</span></label>
                    <input type="number" name="fat_content" value={formData.fat_content} onChange={handleChange} className="input input-bordered w-full rounded-xl" />
                  </div>
                  <div className="form-control w-full">
                    <label className="label"><span className="label-text">Milk Price (Php)</span></label>
                    <input type="number" name="milk_price" value={formData.milk_price} onChange={handleChange} className="input input-bordered w-full rounded-xl" />
                  </div>
                </>
              )}

              <div className="form-control w-full md:col-span-2 lg:col-span-3">
                <label className="label"><span className="label-text">Description</span></label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered w-full rounded-xl" rows="2" maxLength="60"></textarea>
              </div>
            </div>
          </div>

          {/* Footer Actions - Fixed with Amber Theme */}
          <div className="modal-action p-6 pt-2 bg-white border-t">
            <button type="button" className="btn rounded-xl px-8" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn rounded-xl bg-amber-500 hover:bg-amber-600 px-8 text-white border-none ${isDisabled ? 'bg-amber-200' : ''}`} disabled={isDisabled}>
              {isDisabled ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  )
}

export default EditFormulationModal