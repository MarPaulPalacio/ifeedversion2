import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { HiSelector, HiCheck } from 'react-icons/hi'
import CarabaoIdentify from './CarabaoIdentify.jsx'
import CarabaoIdentifyContinue from './CarabaoIdentifyContinue.jsx'
import CarabaoIdentifySetup from './CarabaoIdentifySetup.jsx'
import { useTranslation } from 'react-i18next' // 1. Import the hook

function CreateFormulationModal({
  formulations,
  ownerId,  
  ownerName,
  isOpen,
  onClose,
  onResult,
  userType 
}) {
  const { t } = useTranslation() // 2. Initialize the translation function

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
    months_pregnant: 0
  })
  
  const [carabaoConfiguration, setCarabaoConfiguration] = useState({
    numberofCarabaos: 1,
    multipleCarabaos: false,
    currentCarabaoCreation: 1,
    carabaoPhases: {},
    animalGroupSelection: '',
    moreOpened: false,
    sameConfigTypeArray: [],
    temporaryNameArray: [],
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
  const [currSection, setCurrSection] = useState(0)
  const [monthsPregnantError, setMonthsPregnantError] = useState('')

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

  const identifyCurrentCarabaoPhase = () => {
  const { carabaoPhases, currentCarabaoCreation } = carabaoConfiguration;

    let cumulative = 0;
    
    for (const [phase, count] of Object.entries(carabaoPhases)) {
      
      cumulative += count;
      if (currentCarabaoCreation <= cumulative) {
        console.log("REACHED HERE BRO",[phase.split(/[|()]/)[0].trim(), phase] )
        return [phase.split(/[|()]/)[0].trim(), phase]; // found the current phase
      }
    }
    
    return null; // in case it doesn't match any
  };
  
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
          {/* 3. Wrapped text strings in t() */}
          {(carabaoConfiguration.multipleCarabaos && currSection>0) ? ((identifyCurrentCarabaoPhase()!=null && carabaoConfiguration.sameConfigTypeArray.includes(identifyCurrentCarabaoPhase()[1]))  ? (`${t("Group Configuration for all")} ` + (identifyCurrentCarabaoPhase()[0]) + "s") : (`${t("Create Multiple Carabao Configurations (Carabao Number")} `+ (carabaoConfiguration.currentCarabaoCreation)+" "
           +((carabaoConfiguration.carabaoPhases!={} && identifyCurrentCarabaoPhase()!=null)? identifyCurrentCarabaoPhase()[0]: "")
           + ")"))
          : t("Create Formulation")}
        </h3>
        <p className="mb-4 flex text-sm text-gray-500 whitespace-nowrap">
          <Info />
          {/* 4. Wrapped text string in t() */}
          {t("Set up initial details for your new formulation.")}
        </p>

        {/* First Part */}
        {currSection === 0 ? (
          <CarabaoIdentifySetup
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
          carabaoConfiguration={carabaoConfiguration}
          setCarabaoConfiguration={setCarabaoConfiguration}
          identifyCurrentCarabaoPhase={identifyCurrentCarabaoPhase}
          />
        ) :
        currSection === 1 ? (
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
          carabaoConfiguration={carabaoConfiguration}
          setCarabaoConfiguration={setCarabaoConfiguration}
          identifyCurrentCarabaoPhase= {identifyCurrentCarabaoPhase}
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
          carabaoConfiguration={carabaoConfiguration}
          setCarabaoConfiguration={setCarabaoConfiguration}
          identifyCurrentCarabaoPhase= {identifyCurrentCarabaoPhase}
        />
          </>
        )
        }
        
      </div>
      <form method="dialog" className="modal-backdrop">
        {/* 5. Wrapped close button text */}
        <button onClick={handleClose}>{t("close")}</button>
      </form>

      <div className="modal-backdrop" onClick={handleClose}></div>
    </dialog>
  )
}

export default CreateFormulationModal