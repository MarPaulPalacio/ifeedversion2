import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { HiSelector, HiCheck } from 'react-icons/hi'

function CarabaoIdentifyContinue({
  formulations,
  ownerId,
  ownerName,
  isOpen,
  onClose,
  onResult,
  userType,
  formData,
  setFormData,
  isDisabled,
  setIsDisabled,
  templateQuery,
  setTemplateQuery,
  selectedTemplate,
  setSelectedTemplate,
  fetchedTemplates,
  setFetchedTemplates,
  isLoadingTemplates,
  setIsLoadingTemplates,
  fetchError,
  setFetchError,
  bodyWeightError,
  setBodyWeightError,
  averageDailyGainError,
  setAverageDailyGainError,
  milkYieldError,
  setMilkYieldError,
  fatProteinContentError,
  setFatProteinContentError,
  milkPriceError,
  setMilkPriceError,
  setCurrSection,
  monthsPregnantError,
  setMonthsPregnantError,
  setNameError,
  setCodeError


}) {

  // Dummy template options by animal group
  /*
  const animalGroupTemplates = {
    'Swine': [
      { id: 0, name: 'None' },
      { id: 1, name: 'Swine Sample Template 1' },
      { id: 2, name: 'Swine Sample Template 2' },
      { id: 3, name: 'Swine Sample Template 3' },
      { id: 4, name: 'Swine Sample Template 4' },
      { id: 5, name: 'Swine Sample Template 5' },
      { id: 6, name: 'Swine Sample Template 6' },
    ],
    'Poultry': [
      { id: 0, name: 'None' },
      { id: 7, name: 'Poultry Sample Template 1' },
      { id: 8, name: 'Poultry Sample Template 2' },
      { id: 9, name: 'Poultry Sample Template 3' },
      { id: 10, name: 'Poultry Sample Template 4' },
      { id: 11, name: 'Poultry Sample Template 5' },
      { id: 12, name: 'Poultry Sample Template 6' },
    ],
    'Water Buffalo': [
      { id: 0, name: 'None' },
      { id: 13, name: 'Water Buffalo Sample Template 1' },
      { id: 14, name: 'Water Buffalo Sample Template 2' },
      { id: 15, name: 'Water Buffalo Sample Template 3' },
      { id: 16, name: 'Water Buffalo Sample Template 4' },
      { id: 17, name: 'Water Buffalo Sample Template 5' },
      { id: 18, name: 'Water Buffalo Sample Template 6' },
    ],
  }
  */

  // Fetch templates from backend when modal opens or animal group changes
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingTemplates(true);
    setFetchError('');
    axios.get(`${import.meta.env.VITE_API_URL}/formulation/templates`)
      .then((res) => {
        if (res.data && Array.isArray(res.data.formulations)) {
          setFetchedTemplates(res.data.formulations);
        } else {
          setFetchedTemplates([]);
        }
      })
      .catch(() => {
        setFetchError('Failed to fetch templates');
        setFetchedTemplates([]);
      })
      .finally(() => setIsLoadingTemplates(false));
  }, [isOpen]);

  // Reset template selection when animal group changes
  useEffect(() => {
    setSelectedTemplate({ id: 0, name: 'None' })
    setTemplateQuery('')
  }, [formData.animal_group])

  // Filter fetched templates by selected animal group
  const templateOptions = [
    { id: 0, name: 'None' },
    ...(
      formData.animal_group
        ? fetchedTemplates
            .filter(t => t.animal_group === formData.animal_group)
            .map(t => ({ id: t._id, name: t.name, ...t }))
        : []
    )
  ];
  const isTemplateDisabled = !formData.animal_group || isLoadingTemplates || !!fetchError;
  const filteredTemplates =
    templateQuery === ''
      ? templateOptions
      : templateOptions.filter((t) =>
          t.name.toLowerCase().includes(templateQuery.toLowerCase())
        )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsDisabled(true)

    // client-side validation
    if (
      formulations.some(
        (formulation) =>
          formulation.code.toLowerCase() === formData.code.toLowerCase()
      )
    ) {
      setCodeError('Code already exists ')
      setNameError('')
      setIsDisabled(false)
      return
    } else if (
      formulations.some(
        (formulation) =>
          formulation.name.toLowerCase() === formData.name.toLowerCase()
      )
    ) {
      setNameError('Name already exists')
      setCodeError('')
      setIsDisabled(false)
      return
    } else {
      setNameError('')
    }
    const body = { ...formData, ownerId, ownerName, userType };
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/formulation`,
        body
      )
      let newFormulation = res.data.formulations
      newFormulation.access = 'owner'
      // If a template is selected, clone its dependencies
      if (selectedTemplate && selectedTemplate.id && selectedTemplate.id !== 0) {
        try {
          setIsDisabled(true)
          const cloneRes = await axios.post(
            `${import.meta.env.VITE_API_URL}/formulation/${newFormulation._id}/clone-template`,
            {
              templateId: selectedTemplate.id,
              userId: ownerId
            }
          )
          if (cloneRes.data && cloneRes.data.formulations) {
            newFormulation = cloneRes.data.formulations
          }
        } catch (cloneErr) {
          console.error(cloneErr)
          onResult(null, 'error', 'Failed to clone template dependencies.')
          setIsDisabled(false)
          return
        }
      }
      onResult(newFormulation, 'success', 'Successfully created formulation.')
      // Reset form
      setFormData({
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
        fat_protein_content: '',
      })
    } catch (err) {
      console.log(err)
      onResult(null, 'error', 'Failed to create formulation.')
    } finally {
      setIsDisabled(false)
      setCodeError('')
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

  const handleCheckBoxChange = (e) =>{
    const { name, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleClose = () => {
    setCurrSection(1)
  }

  return (
    <>
        {/* Close button */}
        <div className=' pb-2  whitespace-normal font-bold flex flex-col text-gray-600'>
          <span className='label-text'>Formulation for Carabao {formData.name} used by {formData.code} </span>
          <span className='label-text'>Phase: {formData.animal_group} weigh: {formData.body_weight}</span>
       
        </div>

        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* For Mother carabaos */}
            {(formData.animal_group === 'Cow | Inahing kalabaw' ||
            formData.animal_group === 'Heifer | Dumalaga') &&
            (
              <>
                {formData.animal_group === 'Cow | Inahing kalabaw' && (
                <div className='form-control w-full space-x-5 md:pt-0 pt-0'>
                  <label className="label whitespace-normal">
                    <span className="label-text">Is Lactating (Nag Gagatas?)</span>
                  </label>
                  <select
                    name="is_lactating"
                    value={formData.is_lactating}
                    disabled={isDisabled}
                    onChange={handleChange}
                    className="select select-bordered w-full rounded-xl"
                  >
                    <option value="Not Lactating" defaultChecked>
                      Dry (Not Lactating)
                    </option>
                    <option value="Early Lactation (1-100 Days)">Early Lactation (1-100 Days)</option>
                    <option value="Mid Lactation (101-200 Days)">Mid Lactation (101-200 Days)</option>
                    <option value="Late Lactation (201-305 Days)">Late Lactation (201-305 Days)</option>
                  </select>
                  
                  
                </div>
                )}
                
                <div className={`form-control w-full space-x-5 ${formData.is_pregnant ? '' : 'md:mt-5'}`}>
                  <input 
                    type="checkbox"
                    name="is_pregnant"
                    checked={formData.is_pregnant}
                    disabled={isDisabled}
                    onChange={handleCheckBoxChange}
                    className='checkbox mb-2'
                  />
                  <label className={`label whitespace-normal`}>
                    <span className="label-text">Is Pregnant (Buntis?)</span>
                  </label>
                  {formData.is_pregnant ===true && (
                    <div>
                      <input
                          type="number"
                          name="months_pregnant"
                          value={formData.months_pregnant}
                          required
                          disabled={isDisabled}
                          onChange={handleChange}
                          placeholder="Enter Months Pregnant"
                          className={`input input-bordered w-full rounded-xl ${monthsPregnantError ? 'border-red-500' : ''}`}
                      />
                    </div>
                  )}
                  
                </div>
                
                
                
              </>
            )}

            { formData.animal_group !== "" && formData.animal_group !== "Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)" && (
              <div className='form-control w-full'>
                <label className="label whitespace-normal">
                  <span className="label-text">Average Daily Gain (in kg)</span>
                </label>
                <input
                  type="number"
                  name="average_daily_gain"
                  value={formData.average_daily_gain}
                  required
                  disabled={isDisabled}
                  onChange={handleChange}
                  placeholder="Enter average daily gain"
                  className={`input input-bordered w-full rounded-xl ${averageDailyGainError ? 'border-red-500' : ''}`}
              />
              {averageDailyGainError && (
                <p className="mt-1 text-sm text-red-500" role="alert">
                  {averageDailyGainError}
                </p>
              )}
          
            </div>
            )}

            {formData.animal_group === "Cow | Inahing kalabaw" && (
              <>
              <div className='form-control w-full'>
                <label className="label whitespace-normal">
                  <span className="label-text">Milk Yield Per Day - Kg (Nakukuhang gatas bawat araw - kg)</span>
                </label>
                <input
                  type="number"
                  name="milk_yield"
                  value={formData.milk_yield}
                  required
                  disabled={isDisabled}
                  onChange={handleChange}
                  placeholder="Enter milk yield"
                  className={`input input-bordered w-full rounded-xl ${milkYieldError ? 'border-red-500' : ''}`}
                />
                {milkYieldError && (
                  <p className="mt-1 text-sm text-red-500" role="alert">
                    {milkYieldError}
                  </p>
                )}
              </div>

              <div className='form-control w-full'>
                <label className="label whitespace-normal">
                  <span className="label-text">Fat and Protein Content - % (Taba at Protina - %)</span>
                </label>
                <input
                  type="number"
                  name="fat_protein_content"
                  value={formData.fat_protein_content}
                  required
                  disabled={isDisabled}
                  onChange={handleChange}
                  placeholder="Enter fat and protein content"
                  className={`input input-bordered w-full rounded-xl ${fatProteinContentError ? 'border-red-500' : ''}`}
                />
                {fatProteinContentError && (
                  <p className="mt-1 text-sm text-red-500" role="alert">
                    {fatProteinContentError}
                  </p>
                )}
              </div>

              <div className='form-control w-full'>
                <label className="label whitespace-normal">
                  <span className="label-text">Milk Price - Php (Presyo ng gatas - Php)</span>
                </label>
                <input
                  type="number"
                  name="milk_price"
                  value={formData.milk_price}
                  required
                  disabled={isDisabled}
                  onChange={handleChange}
                  placeholder="Enter milk price"
                  className={`input input-bordered w-full rounded-xl ${milkPriceError ? 'border-red-500' : ''}`}
                />
                {milkPriceError && (
                  <p className="mt-1 text-sm text-red-500" role="alert">
                    {milkPriceError}
                  </p>
                )}
              </div>
              </>
            )}

            {/* Template Combobox - only show if userType is not 'admin' */}
            {userType !== 'admin' && (
              <div className="form-control w-full">
                <label className="label whitespace-normal">
                  <span className="label-text">Use Group Template (Optional)</span>
                </label>
                <Combobox value={selectedTemplate} onChange={setSelectedTemplate} disabled={isTemplateDisabled} by="id">
                  <div className="relative">
                    <ComboboxInput
                      className="input input-bordered w-full rounded-xl pr-10"
                      displayValue={(t) => t?.name || ''}
                      onChange={(e) => setTemplateQuery(e.target.value)}
                      placeholder={isTemplateDisabled ? (fetchError ? fetchError : 'Select animal group first') : 'Select template'}
                      disabled={isTemplateDisabled}
                    />
                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <HiSelector className="h-5 w-5 text-gray-400" />
                    </ComboboxButton>
                    {!isTemplateDisabled && filteredTemplates.length > 0 && (
                      <ComboboxOptions className="absolute z-10 max-h-56 w-full max-w-[350px] overflow-auto bg-white py-1 text-base ring-[0.5px] -mt-[0.1px] focus:outline-none">
                        {filteredTemplates.map((template) => (
                          <ComboboxOption
                            key={template.id}
                            value={template}
                            className={({ active }) =>
                              `cursor-pointer select-none px-4 py-2 ${
                                active ? 'bg-base-200 text-primary' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <span className={`flex items-center`}>
                                {selected && (
                                  <HiCheck className="mr-2 h-5 w-5 text-primary" />
                                )}
                                {template.name}
                              </span>
                            )}
                          </ComboboxOption>
                        ))}
                      </ComboboxOptions>
                    )}
                  </div>
                </Combobox>
              </div>
            )}

            
          </div>

          {/* Modal actions */}
          <div className="modal-action">
            <button
              type="button"
              className="btn rounded-xl px-8"
              onClick={handleClose}
            >
              Back
            </button>
            <button
              type="submit"
              className={`btn bg-green-button ${isDisabled ? 'disabled bg-red-100' : 'hover:bg-green-600'} rounded-xl px-8 text-white`}
            >
              {`${isDisabled ? 'Creating...' : 'Create'}`}
            </button>
          </div>
        </form>

      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>

      <div className="modal-backdrop" onClick={handleClose}></div>
    </>
  )
}

export default CarabaoIdentifyContinue