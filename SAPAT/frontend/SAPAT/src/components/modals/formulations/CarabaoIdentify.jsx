import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { HiSelector, HiCheck } from 'react-icons/hi'
import { useTranslation } from 'react-i18next'
function CarabaoIdentify({
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
  const { t, i18n } = useTranslation();

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
      setCurrSection(2)
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

const handleArrayChange = (e) => {
  console.log("THIS IS CURRENT CARABAO CONFIGURATION", carabaoConfiguration)
  const { name, value } = e.target;
  // Extract the index from the name, e.g., "name_1" → 0
  const index = parseInt(name) - 1;
  

  setCarabaoConfiguration((prev) => {
    const updatedArray = [...prev.temporaryNameArray]; // copy existing array
    updatedArray[index] = value; // update one element
    console.log("This is the item:", carabaoConfiguration.temporaryNameArray[index])
    
    return {
      ...prev,
      temporaryNameArray: updatedArray,
    };

  });
};



  const handleClose = () => {
    setCurrSection(0)
    setFormData({
      code: '',
      name: '',
      description: '',
      animal_group: '',
    })
  }

  const handleCarabaoCategoryPhase = ()=>{
    if (carabaoConfiguration.carabaoPhases!={} && identifyCurrentCarabaoPhase()!=null){
      return identifyCurrentCarabaoPhase()[1]
    } else {
      return formData.animal_group
    }
    
  }

  return (
    <>
      <>
        {/* Close button */}


        <form onSubmit={handleSubmit}>
         
          {/* Form fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            
            {/* Farmer Name */}

            <div className="form-control w-full">
              
              <label className="label">
                <span className="label-text">{t('Farmer Name')}</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                required
                disabled={isDisabled}
                onChange={handleChange}
                placeholder="Enter code"
                className={`input input-bordered w-full rounded-xl ${codeError ? 'border-red-500' : ''}`}
              />
              {codeError && (
                <p className="mt-1 text-sm text-red-500" role="alert">
                  {codeError}
                </p>
              )}
            </div>
            
            {/* Carabao Name */}

            {(identifyCurrentCarabaoPhase()!=null) ? "":(
              <div className="form-control w-full">
              <label className="label">
                <span className="label-text">{t('Carabao Name')}</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                required
                disabled={isDisabled}
                onChange={handleChange}
                placeholder="Enter name"
                className={`input input-bordered w-full rounded-xl ${nameError ? 'border-red-500' : ''}`}
              />
              {nameError && (
                <p className="mt-1 text-sm text-red-500" role="alert">
                  {nameError}
                </p>
              )}
            </div>
            )
            }
            

            {/* Animal Group Select */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">{t('Carabao Category')}</span>
              </label>
              <select
                name="animal_group"
                value={handleCarabaoCategoryPhase()}
                disabled={isDisabled}
                onChange={handleChange}
                className="select select-bordered w-full rounded-xl"
              >
                <option value="" disabled>
                  Choose Carabao Category
                </option>
                <option value="Heifer | Dumalaga">{t('Heifer')}</option>
                <option value="Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)">{t('Calf (0-4 months) - lower than 100kg')}</option>
                <option value="Growing Calves (5-12 months) | Lumalaking bula (5 - 12 buwan)"> {t('Growing Calves (5-12 months)')}</option>
                <option value="Junior Bull | Lumalaking bulugan (2 - 3 taon)">{t('Junior Bull')}</option>
                <option value="Cow | Inahing kalabaw">{t('Cow')}</option>
                <option value="Senior Bull | Bulugan (> 3 taon)">{t('Senior Bull')}</option>
              </select>
            </div>
            
            {/* Body Weight */}
            <div className='form-control w-full'>
              <label className="label">
                <span className="label-text">Body Weight</span>
              </label>
              <input
                type="number"
                name="body_weight"
                value={formData.body_weight}
                required
                disabled={isDisabled}
                onChange={handleChange}
                placeholder="Enter body weight"
                className={`input input-bordered w-full rounded-xl ${bodyWeightError ? 'border-red-500' : ''}`}
              />
              {bodyWeightError && (
                <p className="mt-1 text-sm text-red-500" role="alert">
                  {bodyWeightError}
                </p>
              )}
          
            </div>

            {(identifyCurrentCarabaoPhase()!=null && carabaoConfiguration.sameConfigTypeArray.includes(identifyCurrentCarabaoPhase()[1])) ? (<>
              <div classNamr ="form-control w-full"></div>

              
              {[...Array(carabaoConfiguration.carabaoPhases[identifyCurrentCarabaoPhase()[1]] || 0)].map((_, i) => (
                <div key={i} className="form-control w-full md:col-span-2">
                  <label className="label">
                    <span className="label-text">Carabao Name {i + 1}</span>
                  </label>
                  <input
                    type="text"
                    name={i + 1}
                    value={carabaoConfiguration.temporaryNameArray[i]}
                    // value="SDDS"
                    required
                    disabled={isDisabled}
                    onChange={handleArrayChange}
                    placeholder={`Enter name ${i + 1}`}
                    className={`input input-bordered w-full rounded-xl ${nameError ? 'border-red-500' : ''}`}
                  />

                  {nameError && (
                    <p className="mt-1 text-sm text-red-500" role="alert">
                      {nameError}
                    </p>
                  )}
                </div>
              ))}
            
            </>):(
              <div className="form-control w-full md:col-span-2">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  disabled={isDisabled}
                  onChange={handleChange}
                  placeholder="Enter description"
                  className="textarea textarea-bordered w-full rounded-xl"
                  rows="3"
                  maxLength="60"
                ></textarea>
              </div>
            )
            }
            
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

export default CarabaoIdentify