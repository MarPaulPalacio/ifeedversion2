import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { HiSelector, HiCheck } from 'react-icons/hi'
import { ChevronDown, ChevronUp } from "lucide-react"; // lucide icons

function CarabaoIdentifySetup({
  formulations,
  ownerId,
  ownerName,
  isOpen,
  onClose,
  onResult,
  userType,
  formData,
  setFormData,
  nameError,
  setNameError,
  codeError,
  setCodeError,
  bodyWeightError,
  setBodyWeightError,
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
  setCurrSection,
  carabaoConfiguration,
  setCarabaoConfiguration,
  identifyCurrentCarabaoPhase
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
    
    if (identifyCurrentCarabaoPhase()!=null){
      const carabaoType = identifyCurrentCarabaoPhase()[1]
      setFormData((prev)=>({
        ...prev,
        animal_group: carabaoType
      }))
      const cost = carabaoConfiguration.carabaoPhases[identifyCurrentCarabaoPhase()[1]]
      console.log("The cost is here", cost)
      
      setCarabaoConfiguration((prev) => ({
        ...prev,
        temporaryNameArray: Array.from({ length: cost }, () => " "),
      }));
      
      
    }
    
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
    } else 
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

    const body = { ...formData, ownerId, ownerName, userType };
    try {
      setCurrSection(1)
      console.log("THIS IS CURRENT CARABAO CONFIGURATION", carabaoConfiguration)
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
    setCarabaoConfiguration((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleMultiSelectionChange = (e) => {
    const { name, value } = e.target;

    setCarabaoConfiguration((prev) => ({
      ...prev,
      [name]: value,
    }))
    setCarabaoConfiguration((prev)=>({
        ...prev,
        sameConfigTypeArray: [value]
      }))

      console.log(carabaoConfiguration)
    setCarabaoConfiguration((prev) => ({
      ...prev,
      carabaoPhases: {
        [value]: parseInt(carabaoConfiguration.numberofCarabaos), // add new key with value 0
      },
      
    }));
    
  };

  const handleCheckBoxChange = (e) =>{
    
    const { name, checked } = e.target
    setCarabaoConfiguration((prev) => ({
      ...prev,
      [name]: checked,
    }))
    if (name === "multipleCarabaos" ){
      
      setCarabaoConfiguration((prev)=>({
        ...prev,
        numberofCarabaos: 1,
        currentCarabaoCreation: 1,
        carabaoPhases: {},
        animalGroupSelection: '',
        moreOpened: false,
        sameConfigTypeArray: [],
        temporaryNameArray: [],
      }))
    }
  }



  const handleClose = () => {
    setCurrSection(0)
    onClose()
    setFormData({
      code: '',
      name: '',
      description: '',
      animal_group: '',
    })
    setCarabaoConfiguration({
      numberofCarabaos: 1,
      multipleCarabaos: false,
      currentCarabaoCreation: 1,
      carabaoPhases: {},
      animalGroupSelection: '',
      moreOpened: false,
      sameConfigTypeArray: [],
      temporaryNameArray: [],
    })
  }

  const handlePhaseChange = (phase, value) => {
    setCarabaoConfiguration((prev) => ({
      ...prev,
      carabaoPhases: {
        ...prev.carabaoPhases,
        [phase]: value,
      },
    }));
  };

  const handleQuantityChange = (phase, value) => {
    setFormData((prev) => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [phase]: value,
      },
    }));
  };

  const checkSameConfigArray = (name) =>{
    return carabaoConfiguration.sameConfigTypeArray.includes(name);
  }

  const handleSameConfigChange = (e) =>{
    const {name} = e.target
    
    if (checkSameConfigArray(name)){
      
      setCarabaoConfiguration((prev)=>({
        ...prev,
        sameConfigTypeArray: prev.sameConfigTypeArray.filter((phase)=>phase!==name)
      }))

    } else {
      setCarabaoConfiguration((prev)=>({
        ...prev,
        sameConfigTypeArray: [...prev.sameConfigTypeArray, name]
      }))
    }
  }

  return (
    <>
      <>
        {/* Close button */}
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-1">
            {/* Ask for multi configuration of carabaos */}
            <div className="form-control w-full">
                  <input 
                    type="checkbox"
                    name="multipleCarabaos"
                    checked={carabaoConfiguration.multipleCarabaos}
                    disabled={isDisabled}
                    onChange={handleCheckBoxChange}
                    className='checkbox mb-2 mr-3'
                  />
                  <label className={`label whitespace-normal pb-5`}>
                    <span className="label-text">Multiple Carabao Configuration? (Multiple Carabaos with Same Configuration)</span>
                  </label>

                  
                  {carabaoConfiguration.multipleCarabaos ===true && (<>
                    <div>
                      <input
                          type="number"
                          name="numberofCarabaos"
                          value={carabaoConfiguration.numberofCarabaos}
                          required
                          disabled={isDisabled}
                          onChange={handleChange}
                          placeholder="Enter Number of Carabaos"
                          className={`input input-bordered w-full rounded-xl ${codeError ? 'border-red-500' : ''}`}
                      />
                    </div>
                    
                    <div className='form-control w-full space-x-5 md:pt-0 mt-5'>
                      <label className="label whitespace-normal">
                        <span className="label-text">Choose Phase:</span>
                      </label>
                      <select
                        name="animalGroupSelection"
                        value={carabaoConfiguration.animalGroupSelection}
                        disabled={isDisabled}
                        onChange={handleMultiSelectionChange}
                        className="select select-bordered w-full rounded-xl"
                      >
                        <option value="Heifer | Dumalaga">Heifer | Dumalaga</option>
                        <option value="Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)">Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)</option>
                        <option value="Growing Calves (5-12 months) | Lumalaking bula (5 - 12 buwan)">Growing Calves (5-12 months) | Lumalaking bula (5 - 12 buwan)</option>
                        <option value="Junior Bull | Lumalaking bulugan (2 - 3 taon)">Junior Bull | Lumalaking bulugan (2 - 3 taon)</option>
                        <option value="Cow | Inahing kalabaw">Cow | Inahing kalabaw</option>
                        <option value="Senior Bull | Bulugan (> 3 taon)">Senior Bull | Bulugan ({'>'} 3 taon)</option>
                      </select>
                    </div>
                    </>
                  )}
              {codeError && (
                <p className="mt-1 text-sm text-red-500" role="alert">
                  {codeError}
                </p>
              )}
            </div>

            
          </div>

          {/* Modal actions */}
          <div className="modal-action">
            <button
              type="button"
              className="btn rounded-xl px-8"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn bg-green-button ${isDisabled ? 'disabled bg-red-100' : 'hover:bg-green-600'} rounded-xl px-8 text-white`}
            >
              {`${isDisabled ? 'Creating...' : 'Continue'}`}
            </button>
          </div>
        </form>
      </>
    </>
  )
}

export default CarabaoIdentifySetup