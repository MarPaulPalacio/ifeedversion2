import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { HiSelector, HiCheck } from 'react-icons/hi'
import GroupIdentify from './GroupIdentify.jsx'
import CarabaoIdentifyContinue from '../formulations/CarabaoIdentifyContinue.jsx'
import CarabaoIdentifySetup from '../formulations/CarabaoIdentifySetup.jsx'
import Toast from '../../Toast.jsx'
// import CarabaoIdentifyContinue from './CarabaoIdentifyContinue.jsx'

function GroupFormulationModal({
  formulations,
  ownerId,  
  ownerName,
  isOpen,
  onClose,
  onResult,
  userType 
}) {
  const [formData, setFormData] = useState({
    animal_group: '',
    body_weight: '',
    carabaos: [],
    nutrients: [
      {
        group: '',
        name: '',
        unit: '',
        min_value:0,
        max_value:0,
      },
    ],
    ingredients: [
      
    ]
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


  const [showToast, setShowToast] = useState(false)
  const [message, setMessage] = useState('')
  const [toastAction, setToastAction] = useState('')

  const hideToast = () => {
    setShowToast(false)
    setMessage('')
    setToastAction('')
  }
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
    console.log("Form Data Information in useEffect: ", formData )
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
    
    setCurrSection(0)
  }

  // Update formulationData
  const updateDatabase = async (currentformulation, formulationRoomIds, type) => {
    try {

      console.log("DEBUG HERE: FRONTEND SENING OF DATA TO SOLVER!")
      console.log("Nutrients before optimization:", currentformulation.nutrients)
      console.log("WeightInGrams before optimization:", currentformulation.weight)
      console.log("Ingredients in grams before optimization:", currentformulation.ingredients)


      const currentFormulation = currentformulation
      const VITE_API_URL = import.meta.env.VITE_API_URL
      
      setShowToast(true) // Show success toast
      setMessage('Formulation saved to database!')
      setToastAction('success')

      // Sync updated formulation to selected Liveblocks rooms

      // const ingredientsInGrams = currentFormulation.ingredients.map(ing => ({
      //       ...ing,
      //       minimum: ing.minimum * 1000,
      //       maximum: ing.maximum * 1000,

      // }));
      // const weightinGrams = currentFormulation.weight * 1000


      // // First, run the optimization endpoint
      // const res = await axios.post(`${VITE_API_URL}/optimize/simplex`, {
      //   userId: ownerId,
      //   ingredients: ingredientsInGrams,
      //   nutrients: currentFormulation.nutrients,
      //   weight: weightinGrams,
      //   nutrientRatioConstraints: currentFormulation.nutrientRatioConstraints || [],
      //   type: currentFormulation.animal_group
      // });

      // // Optionally, update currentFormulation with optimized data if needed
      // // Example: currentFormulation.ingredients = optimizeRes.data.ingredients;

      // const optimizedCost = res.data.optimizedCost
      // const optimizedIngredients = res.data.optimizedIngredients
      // const optimizedNutrients = res.data.optimizedNutrients
      // const shadowPricesResult = res.data.shadowPrices
      // const amountFed = parseFloat(res.data.weight/1000).toFixed(2)

      // const updatedFormulation = {
      //   ...currentFormulation,
      //   cost: optimizedCost / 1000,
      //   ingredients: currentFormulation.ingredients.map(ing => {
      //     const matched = optimizedIngredients.find(optIng => optIng.name === ing.name);
      //     return {
      //      ...ing,
      //     value: matched && matched.value ? matched.value / 1000 : ing.value
      //     };
      //   }),
      //   nutrients: currentFormulation.nutrients.map(nut => {
      //     const matched = optimizedNutrients.find(optNut => optNut.name === nut.name);
      //     return {
      //   ...nut,
      //   value: matched && matched.value !== undefined ? matched.value/1000 : nut.value
      //     };
      //   }),
      // };

    if (1) {
      await axios.put(`${VITE_API_URL}/formulation/${currentFormulation._id}`, {
        code: currentFormulation.code,
        name: currentFormulation.name,
        description: currentFormulation.description,
        animal_group: currentFormulation.animal_group,
        cost: currentFormulation.cost,
        weight: currentFormulation.weight,
        ingredients: currentFormulation.ingredients,
        nutrients: currentFormulation.nutrients,
      }
      )
    } 
    //else {
    //   await axios.put(`${VITE_API_URL}/formulation/${currentFormulation._id}`, {
    //     code: currentFormulation.code,
    //     name: currentFormulation.name,
    //     description: currentFormulation.description,
    //     animal_group: currentFormulation.animal_group,
    //     cost: updatedFormulation.cost,
    //     weight: currentFormulation.weight,
    //     ingredients: updatedFormulation.ingredients,
    //     nutrients: updatedFormulation.nutrients,
    //   }
    //   )
    // }

      // Then, sync to Liveblocks

      console.log("updated Formulation to be synced:", updatedFormulation)
      console.log("type in updateDatabase:", type)
      await axios.post(`${VITE_API_URL}/api/liveblocks/sync-formulations`, {
        targetRoomIds: formulationRoomIds,
        masterData: currentFormulation
      }, { withCredentials: true });
      console.log("Sync request sent to backend for rooms:", formulationRoomIds, "with data:", currentFormulation);
      } catch (error) {
        console.error('Error updating database:', error)
        setShowToast(true) // Show success toast
        setMessage('Changes not saved! Tap to retry.')
        setToastAction('error')
      }
    }

  const identifyCurrentCarabaoPhase = () => {
  const { carabaoPhases, currentCarabaoCreation } = carabaoConfiguration;
    let cumulative = 0;
    
    for (const [phase, count] of Object.entries(carabaoPhases)) {
      
      cumulative += count;
      if (currentCarabaoCreation <= cumulative) {
        
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
          {(carabaoConfiguration.multipleCarabaos && currSection>0) ? ((identifyCurrentCarabaoPhase()!=null && carabaoConfiguration.sameConfigTypeArray.includes(identifyCurrentCarabaoPhase()[1]))  ? ("Group Configuration for all " + (identifyCurrentCarabaoPhase()[0]) + "s") : ("Create Multiple Carabao Configurations (Carabao Number "+ (carabaoConfiguration.currentCarabaoCreation)+" "
           +((carabaoConfiguration.carabaoPhases!={} && identifyCurrentCarabaoPhase()!=null)? identifyCurrentCarabaoPhase()[0]: "")
           + ")"))
          : "Modify Formulation by Group"}
        </h3>
        <p className="mb-4 flex text-sm text-gray-500 whitespace-nowrap">
          <Info />
          Modify formulation details based on carabao type and weight.
        </p>


        <GroupIdentify
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
          updateDatabase={updateDatabase}
        />
        

        
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
      <Toast
        className="transition delay-150 ease-in-out"
        show={showToast}
        action={toastAction}
        message={message}
        onHide={hideToast}
      />
      <div className="modal-backdrop" onClick={handleClose}></div>
    </dialog>
  )
}

export default GroupFormulationModal