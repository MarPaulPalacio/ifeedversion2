import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { HiSelector, HiCheck } from 'react-icons/hi'
import CarabaoIdentify from './CarabaoIdentify.jsx'
import CarabaoIdentifyContinue from './CarabaoIdentifyContinue.jsx'
// import CarabaoIdentifyContinue from './CarabaoIdentifyContinue.jsx'

function CreateFormulationModal({
  formulations,
  ownerId,
  ownerName,
  isOpen,
  onClose,
  onResult,
  userType 
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
    fat_protein_content: '',
  })
  const [isDisabled, setIsDisabled] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [nameError, setNameError] = useState('')
  const [bodyWeightError, setBodyWeightError] = useState('')
  const [averageDailyGainError, setAverageDailyGainError] = useState('')
  const [milkYieldError, setMilkYieldError] = useState('')
  const [fatProteinContentError, setFatProteinContentError] = useState('')
  const [milkPriceError, setMilkPriceError] = useState('')
  const [templateQuery, setTemplateQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState({ id: 0, name: 'None' })
  const [fetchedTemplates, setFetchedTemplates] = useState([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [currSection, setCurrSection] = useState(1)
  const [monthsPregnantError, setMonthsPregnantError] = useState('')
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

  const handleClose = () => {
    onClose()
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
    setCurrSection(1)
  }

  return (
    <dialog
      id="create_formulation_modal"
      className={`modal ${isOpen ? 'modal-open' : ''}`}
    >
      <div className="modal-box relative w-11/12 max-w-3xl min-h-[300px] min-w-[350px] max-h-[95%] overflow-x-clip overflow-y-auto scroll rounded-3xl bg-white md:mt-0">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle absolute top-4 right-4"
          onClick={handleClose}
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-1 text-lg font-bold">
          Create Formulation
        </h3>
        <p className="mb-8 flex text-sm text-gray-500 whitespace-nowrap">
          <Info />
          Set up initial details for your new formulation.
        </p>


        {/* First Part */}
        {currSection === 1 ? (
          <CarabaoIdentify
          formulations={formulations}
          ownerId={ownerId}
          ownerName={ownerName}
          isOpen={isOpen}
          onClose={onClose}
          onResult={onResult}
          userType={userType}
          formData={formData}
          setFormData={setFormData}
          nameError={nameError}
          setNameError={setNameError}
          codeError={codeError}
          setCodeError={setCodeError}
          bodyWeightError={bodyWeightError}
          setBodyWeightError={setBodyWeightError}
          isDisabled={isDisabled}
          setIsDisabled={setIsDisabled}
          templateQuery={templateQuery}
          setTemplateQuery={setTemplateQuery}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          fetchedTemplates={fetchedTemplates}
          setFetchedTemplates={setFetchedTemplates}
          isLoadingTemplates={isLoadingTemplates}
          setIsLoadingTemplates={setIsLoadingTemplates}
          fetchError={fetchError}
          setFetchError={setFetchError}
          setCurrSection={setCurrSection}
        />

        ) :
        currSection == 2 && (
          <>
          <CarabaoIdentifyContinue
          formulations={formulations}
          ownerId={ownerId}
          ownerName={ownerName}
          isOpen={isOpen}
          onClose={onClose}
          onResult={onResult}
          userType={userType}
          formData={formData}
          setFormData={setFormData}
          isDisabled={isDisabled}
          setIsDisabled={setIsDisabled}
          templateQuery={templateQuery}
          setTemplateQuery={setTemplateQuery}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          fetchedTemplates={fetchedTemplates}
          setFetchedTemplates={setFetchedTemplates}
          isLoadingTemplates={isLoadingTemplates}
          setIsLoadingTemplates={setIsLoadingTemplates}
          fetchError={fetchError}
          setFetchError={setFetchError}
          bodyWeightError={bodyWeightError}
          setBodyWeightError={setBodyWeightError}
          averageDailyGainError={averageDailyGainError}
          setAverageDailyGainError={setAverageDailyGainError}
          milkYieldError={milkYieldError}
          setMilkYieldError={setMilkYieldError}
          fatProteinContentError={fatProteinContentError}
          setFatProteinContentError={setFatProteinContentError}
          milkPriceError={milkPriceError}
          setMilkPriceError={setMilkPriceError}
          setCurrSection={setCurrSection}
          monthsPregnantError={monthsPregnantError}
          setMonthsPregnantError={setMonthsPregnantError}
          setNameError={setNameError}
          setCodeError={setCodeError}
        />
          </>
        )
        }
        
        {/* Second Part */}

        
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>

      <div className="modal-backdrop" onClick={handleClose}></div>
    </dialog>
  )
}

export default CreateFormulationModal