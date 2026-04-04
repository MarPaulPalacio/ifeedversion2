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
  setCodeError,
  carabaoConfiguration,
  setCarabaoConfiguration,
  identifyCurrentCarabaoPhase,
}) {

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
      
      if (
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
    
    try {
      let bodynutrient_constraints = []
      let nutrients = []
      let dmintake = 0;


        function nutrientsToConstraintFormat(bodynutrient_constraints, formData, drymatterintake, dmNutrient) {
            const nutrients = bodynutrient_constraints.map(nc => {
              console.log("Nutrient Constraint:", nc)
              const constraint_percent = 0.20;

              let minimumvalue = 0;
              let maximumvalue = 10000;

              // Default minimum value and maximum values
              minimumvalue = nc.constraintvalue - (nc.constraintvalue * constraint_percent);
              maximumvalue = nc.constraintvalue + (nc.constraintvalue * constraint_percent);

              if (formData.animal_group === 'Cow | Inahing kalabaw') {
                if (formData.months_pregnant && formData.months_pregnant >= 7) {
                  // 3rd Trimester
                  minimumvalue = minimumvalue * 1.30;
                  maximumvalue = maximumvalue * 1.30;
                }
                if (nc.name === 'Total Digestible Nutrients' && formData.months_pregnant !="Not Pregnant"){
                  minimumvalue = minimumvalue * 1.25;
                  maximumvalue = maximumvalue * 1.25;
                }
                if (nc.name === 'Crude Protein' && formData.months_pregnant !== "Not Pregnant"){
                  minimumvalue = minimumvalue * 1.50;
                  maximumvalue = maximumvalue * 1.50;
                }
                if (nc.is_lactating === 'Early Lactation (1-100 Days)'){
                  minimumvalue = minimumvalue * 1.25;
                  maximumvalue = maximumvalue * 1.25;
                }

              } else if (formData.animal_group === 'Heifer | Dumalaga') {
                if (formData.months_pregnant && formData.months_pregnant >= 7) {
                  // 3rd Trimester
                  minimumvalue = minimumvalue * 1.30;
                  maximumvalue = maximumvalue * 1.30;
                }
                if (nc.name === 'Total Digestible Nutrients' && formData.months_pregnant !="Not Pregnant"){
                  minimumvalue = minimumvalue * 1.25;
                  maximumvalue = maximumvalue * 1.25;
                }
                if (nc.name === 'Crude Protein' && formData.months_pregnant !== "Not Pregnant"){
                  minimumvalue = minimumvalue * 1.50;
                  maximumvalue = maximumvalue * 1.50;
                }
              }
              return {
                nutrient_id: nc.nutrientid,
                _id: nc._id,
                name: nc.name,
                // minimum: nc.constraintvalue - nc.constraintvalue * constraint_percent,
                // maximum: nc.constraintvalue + nc.constraintvalue * constraint_percent,
                minimum:minimumvalue,
                maximum:maximumvalue,
                // minimum: 0,
                // maximum:10000,
                value: nc.value,
                unit: nc.unit
              }
            });

            console.log("Nutrients after mapping constraints:", dmNutrient)
            const nutrientWithDryMatter = 
            nutrients.find(n => n.name === 'Dry Matter') 
              ? nutrients 
              : [...nutrients, { nutrient_id: dmNutrient._id, _id: dmNutrient._id, name: 'Dry Matter', minimum: drymatterintake * 0.8 * 1000, maximum: drymatterintake * 1.2 * 1000, value: 0, unit: '%' }]
            return nutrientWithDryMatter;
            // return nutrients;
        }
      

      
      function cowWeight(weight) {
        const weights = [350, 400, 450, 500, 550, 600, 650, 700, 750, 800];
        if (weight < 350) return 350;
        if (weight > 800) return 800;
        return weights.reduce((prev, curr) => Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev);
      }

      
      
      // Fetch body nutrient constraints if animal group is Cow and body weight is provided
      if (formData.animal_group === 'Cow | Inahing kalabaw' && formData.body_weight) {

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/formulation/cow`, {
          params: { weight: cowWeight(formData.body_weight) },

        });

        bodynutrient_constraints = res.data.formulation.nutrientrequirement;

        const drymatterintake = res.data.formulation.intake ? (res.data.formulation.intake*formData.body_weight) : 0;
        // console.log("BNC:", bodynutrient_constraints)
        
        dmintake = res.data.formulation.intake ? (res.data.formulation.intake*formData.body_weight) : 0;

        const nutrientRes = await axios.get(`${import.meta.env.VITE_API_URL}/nutrient/filtered/${ownerId}`);

        console.log("Nutrient Response:", nutrientRes.data.nutrients)
       
        const dmNutrient = nutrientRes.data.nutrients.find(n => n.name === 'Dry Matter' || n.abbreviation === 'DM');

        nutrients = nutrientsToConstraintFormat(bodynutrient_constraints, formData, drymatterintake, dmNutrient);
      } else {
        console.log("Animal group is not Cow or body weight is missing, skipping body nutrient constraint fetch.")
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/formulation/carabao`, {
          params: { weight: cowWeight(formData.body_weight), adg: formData.average_daily_gain},
        });

        bodynutrient_constraints = res.data.formulation.nutrientrequirement;

        const drymatterintake = res.data.formulation.intake ? (res.data.formulation.intake*formData.body_weight) : 0;
        // console.log("BNC:", bodynutrient_constraints)
        
        dmintake = res.data.formulation.intake ? (res.data.formulation.intake*formData.body_weight) : 0;

        const nutrientRes = await axios.get(`${import.meta.env.VITE_API_URL}/nutrient/filtered/${ownerId}`);

        console.log("Nutrient Response:", nutrientRes.data.nutrients)
       
        const dmNutrient = nutrientRes.data.nutrients.find(n => n.name === 'Dry Matter' || n.abbreviation === 'DM');

        nutrients = nutrientsToConstraintFormat(bodynutrient_constraints, formData, drymatterintake, dmNutrient);

      }

      

      
      const milkyield = formData.milk_yield ? parseFloat(formData.milk_yield) : 0;
      if (carabaoConfiguration.multipleCarabaos=== true && carabaoConfiguration.temporaryNameArray!==null && carabaoConfiguration.temporaryNameArray.length !==0 && identifyCurrentCarabaoPhase()!==null && carabaoConfiguration.sameConfigTypeArray.includes(identifyCurrentCarabaoPhase()[1])){
        await Promise.all(
          carabaoConfiguration.temporaryNameArray.map(async (element) => {
            const updatedFormData= {
              ...formData,
              name: element,
            };
            console.log("Form Data for multiple carabaos:", nutrients)
            const body = { ...updatedFormData, dmintake, ownerId, ownerName, userType, bodynutrient_constraints, nutrients, milkyield};
            console.log("Data before posting", formData)
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/formulation`, body);
            let newFormulation = res.data.formulations;
            newFormulation.access = 'owner';
            onResult(newFormulation, 'success', 'Successfully created formulation.', carabaoConfiguration, setCarabaoConfiguration)
          })
        );
        carabaoConfiguration.currentCarabaoCreation += carabaoConfiguration.carabaoPhases[identifyCurrentCarabaoPhase()[1]]
      } else {
        console.log("Form Data for single carabao:", formData)
        const body = { ...formData, dmintake, ownerId, ownerName, userType, bodynutrient_constraints, nutrients, milkyield};
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/formulation`, body);
        let newFormulation = res.data.formulations
        newFormulation.access = 'owner'
        onResult(newFormulation, 'success', 'Successfully created formulation.', carabaoConfiguration, setCarabaoConfiguration)
      }


    } catch (err) {
      console.log(err)
      onResult(null, 'error', 'Failed to create formulation.', carabaoConfiguration, setCarabaoConfiguration)
    } finally {
      setIsDisabled(false)
      setCodeError('')
      setNameError('')
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
        fat_protein_content: ''
      })
      if (identifyCurrentCarabaoPhase()!==null && carabaoConfiguration.currentCarabaoCreation != carabaoConfiguration.numberofCarabaos && carabaoConfiguration.multipleCarabaos===true){
        const carabaoType = identifyCurrentCarabaoPhase()[1]
        setFormData((prev)=>({
          ...prev,
          animal_group: carabaoType
        }))
        setCurrSection(1)
        console.log("Creating next formulation")
      }
      else if (carabaoConfiguration.currentCarabaoCreation !== carabaoConfiguration.numberofCarabaos && carabaoConfiguration.multipleCarabaos===true){
        
        setCurrSection(1)
      } else {
        setCurrSection(0)
      }
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
          {identifyCurrentCarabaoPhase()!=null && Object.keys(carabaoConfiguration.carabaoPhases).includes(identifyCurrentCarabaoPhase()[1]) ? 
          <>
            <span className='label-text'>Group Formulation for Carabaos used by [{carabaoConfiguration.temporaryNameArray}] </span>
            <span className='label-text'>Phase: {formData.animal_group} Weight: {formData.body_weight}</span>
          </>
          
           : (
          <>
          <span className='label-text'>Formulation for Carabao {formData.name} used by {formData.code} </span>
          <span className='label-text'>Phase: {formData.animal_group} weigh: {formData.body_weight}</span>
          </>
          )
          
          }
          

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
                
                <div className='form-control w-full space-x-5 md:pt-0 pt-0'>
                    <label className="label whitespace-normal">
                      <span className="label-text">Is Pregnant (Buntis?)</span>
                    </label>
                    <select
                      name="months_pregnant"
                      value={formData.months_pregnant || "Not Pregnant"}
                      disabled={isDisabled}
                      onChange={handleChange}
                      className={`select select-bordered w-full rounded-xl ${monthsPregnantError ? 'border-red-500' : ''}`}
                    >
                      <option value="Not Pregnant">Not Pregnant (Hindi Buntis)</option>
                      <option value="1">1-8 Months</option>
                      <option value="9">9-11 Months</option>
                    </select>
                  </div>
                
                
                
              </>
            )}

            { formData.animal_group !== "" && formData.animal_group !== "Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)" && 
            formData.animal_group !== "Cow | Inahing kalabaw" && (
              <div className='form-control w-full'>
  
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
                {averageDailyGainError && (
                  <label className="label">
                    <span className="label-text-alt text-red-500">Please select a gain value.</span>
                  </label>
                )}

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
            {/* {userType !== 'admin' && (
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
            )} */}

            
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