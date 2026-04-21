import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { HiSelector, HiCheck } from 'react-icons/hi'
import { ChevronDown, ChevronUp } from "lucide-react"; // lucide icons
// Import useTranslation from your library
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation();

  // Dummy template options by animal group
  /*
  const animalGroupTemplates = {
    ...
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
        setFetchError(t('Failed to fetch templates'));
        setFetchedTemplates([]);
      })
      .finally(() => setIsLoadingTemplates(false));
  }, [isOpen]);

  // Reset template selection when animal group changes
  useEffect(() => {
    setSelectedTemplate({ id: 0, name: t('None') })
    setTemplateQuery('')
  }, [formData.animal_group])

  // Filter fetched templates by selected animal group
  const templateOptions = [
    { id: 0, name: t('None') },
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
      setCodeError(t('Code already exists'))
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
      setNameError(t('Name already exists'))
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
      onResult(null, 'error', t('Failed to create formulation.'))
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
                  <div className="flex flex-col gap-4">

                    {/* Option: Single Carabao */}
                  <div className="flex items-center">
                    <input 
                      type="radio"
                      name="carabaoCount"
                      value="single"
                      checked={carabaoConfiguration.multipleCarabaos === false}
                      disabled={isDisabled}
                      onChange={() => setCarabaoConfiguration((prev) => ({ ...prev, multipleCarabaos: false }))}
                      className='radio mb-2 mr-3'
                      id="single-carabao"
                    />
                    <label htmlFor="single-carabao" className="label whitespace-normal pb-2">
                      <span className="label-text">{t("Add Single Carabao")}</span>
                    </label>
                  </div>
                  {/* Option: Multiple Carabaos */}
                  <div className="flex items-center">
                    <input 
                      type="radio"
                      name="carabaoCount"
                      value="multiple"
                      checked={carabaoConfiguration.multipleCarabaos === true}
                      disabled={isDisabled}
                      onChange={() => setCarabaoConfiguration((prev) => ({ ...prev, multipleCarabaos: true }))} // Assuming your handler can take the value
                      className='radio mb-2 mr-3'
                      id="multiple-carabao"
                    />
                    <label htmlFor="multiple-carabao" className="label whitespace-normal pb-2">
                      <span className="label-text">{t("Add Multiple Carabaos With Same Configuration")}</span>
                    </label>
                  </div>
                </div>

                  
                  {carabaoConfiguration.multipleCarabaos ===true && (<>
                    <div>
                      <input
                          type="number"
                          name="numberofCarabaos"
                          value={carabaoConfiguration.numberofCarabaos}
                          required
                          disabled={isDisabled}
                          onChange={handleChange}
                          placeholder={t("Enter Number of Carabaos")}
                          className={`input input-bordered w-full rounded-xl ${codeError ? 'border-red-500' : ''}`}
                      />
                    </div>
                    
                    <div className='form-control w-full space-x-5 md:pt-0 mt-5'>
                      <label className="label whitespace-normal">
                        <span className="label-text">{t("Choose Phase:")}</span>
                      </label>
                      <select
                        name="animalGroupSelection"
                        value={carabaoConfiguration.animalGroupSelection}
                        disabled={isDisabled}
                        required
                        onChange={handleMultiSelectionChange}
                        className="select select-bordered w-full rounded-xl"
                      >
                        {/* Note: the value props shouldn't be translated if backend/logic depends on exact spelling, just the display text inside */}
                        <option value="">{t("Select Phase")}</option>
                        <option value="Heifer | Dumalaga">{t("Heifer | Dumalaga")}</option>
                        <option value="Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)">{t("Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)")}</option>
                        <option value="Growing Calves (5-12 months) | Lumalaking bula (5 - 12 buwan)">{t("Growing Calves (5-12 months) | Lumalaking bula (5 - 12 buwan)")}</option>
                        <option value="Junior Bull | Lumalaking bulugan (2 - 3 taon)">{t("Junior Bull | Lumalaking bulugan (2 - 3 taon)")}</option>
                        <option value="Cow | Inahing kalabaw">{t("Cow | Inahing kalabaw")}</option>
                        <option value="Senior Bull | Bulugan (> 3 taon)">{t("Senior Bull | Bulugan (> 3 taon)")}</option>
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
              {t("Cancel")}
            </button>
            <button
              type="submit"
              className={`btn bg-green-button ${isDisabled ? 'disabled bg-red-100' : 'hover:bg-green-600'} rounded-xl px-8 text-white`}
            >
              {isDisabled ? t("Creating...") : t("Continue")}
            </button>
          </div>
        </form>
      </>
    </>
  )
}

export default CarabaoIdentifySetup