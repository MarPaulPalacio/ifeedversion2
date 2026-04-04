import { 
  RiShareLine, RiAddLine, RiCalculatorLine, RiDeleteBinLine, RiSave2Line, 
  RiPencilLine, RiLineChartLine, RiMore2Fill, RiSettings4Line, 
  RiArrowDownSLine, RiInformationLine, RiBarChartLine , RiMenuUnfoldLine, RiMenuFoldLine, RiArrowRightSLine, RiBookLine,
  RiHistoryLine
} from 'react-icons/ri';


import OptimizationResultsModal from '../../components/modals/OptimizationResultsModal.jsx';
import OptimizeFAB from '../../components/buttons/OptimizeFAB.jsx';
import { motion, AnimatePresence } from 'framer-motion'
import Info from '../../components/icons/Info.jsx'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Loading from '../../components/Loading.jsx'
import ShareFormulationModal from '../../components/modals/formulations/ShareFormulationModal.jsx'
import ConfirmationModal from '../../components/modals/ConfirmationModal.jsx'
import Toast from '../../components/Toast.jsx'
import Avatar from '../../components/Avatar.jsx'
import Selection from '../../components/Selection.jsx'
import ChooseIngredientsModal from '../../components/modals/viewformulation/ChooseIngredientsModal.jsx'
import ChooseNutrientsModal from '../../components/modals/viewformulation/ChooseNutrientsModal.jsx'
import ChooseNutrientRatiosModal from '../../components/modals/viewformulation/ChooseNutrientRatiosModal.jsx'
import Warning from '../../components/icons/Warning.jsx'
import GenerateReport from '../../components/buttons/GenerateReport.jsx'
import UserCustomizationModal from '../../components/modals/formulations/UserCustomizationModal.jsx'
import handleGenerateReport from '../../components/handleGenerateReport.jsx'
import ShadowPricingTab from '../../components/modals/viewformulation/ShadowPricingTab.jsx'
import Progress from '../../components/modals/formulations/Progress.jsx'
import EditFormulationModal from '../../components/modals/formulations/EditFormulationModal.jsx';
import ManualFormulation from '../../components/modals/ManualFormulation.jsx';
const COLORS = ['#DC2626', '#D97706', '#059669', '#7C3AED', '#DB2777']

function ViewFormulation({
  formulation,
  owner,
  userAccess,
  id,
  user,
  self,
  others,
  updateMyPresence,
  formulationRealTime,
  updateWeight,
  updateCode,
  updateName,
  updateDescription,
  updateAnimalGroup,
  updateCost,
  updateIngredients,
  updateNutrients,
  updateIngredientProperty,
  updateNutrientProperty,
  handleSave,
  specialformulations,
  updateShadowPrices,
  shadowPrices, 
  nutrientsMenu,
  updateNutrientsMenu,
  ingredientsMenu, 
  updateIngredientsMenu,
  nutrientRatioConstraints,
  updateNutrientRatioConstraints,
}) {
  const VITE_API_URL = import.meta.env.VITE_API_URL

  

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [collaborators, setCollaborators] = useState([])
  const [newCollaborator, setNewCollaborator] = useState({})

  const [isShareFormulationModalOpen, setIsShareFormulationModalOpen] =
    useState(false)
  const [isAddCollaboratorModalOpen, setIsAddCollaboratorModalOpen] =
    useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // toast visibility
  const [showToast, setShowToast] = useState(false)
  const [message, setMessage] = useState('')
  const [toastAction, setToastAction] = useState('')

  // all available ingredients and nutrients of the owner
  const [listOfIngredients, setListOfIngredients] = useState([])
  const [listOfNutrients, setListOfNutrients] = useState([])

  // choosing ingredients and nutrients to create feeds
  const [isChooseIngredientsModalOpen, setIsChooseIngredientsModalOpen] =
    useState(false)
  const [isChooseNutrientsModalOpen, setIsChooseNutrientsModalOpen] =
    useState(false)
  const [isChooseNutrientRatiosModalOpen, setIsChooseNutrientRatiosModalOpen] =
    useState(false)


  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isPCCModalOpen, setIsPCCModalOpen] = useState(false)
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [constraintMode, setConstraintMode] =useState('none')

  const [optimizationResults, setOptimizationResults] = useState(null);
const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false)


const handleEditResult = (updatedFormulation, action, message) => {
    setIsEditModalOpen(false)
    // setFormulations((prevFormulations) => {
    //   const index = prevFormulations.findIndex(
    //     (formulation) => formulation._id === updatedFormulation._id
    //   )
    //   const updated = [...prevFormulations]
    //   const formulationAccess = updated[index].access
    //   updated[index] = { ...updatedFormulation, access: formulationAccess }
    //   return updated
    // })
    // toast instructions
    setShowToast(true)
    setMessage(message)
    setToastAction(action)
  }

  const [isLargeOrSmaller, setIsLargeOrSmaller] = useState(false);
  useEffect(() => {
    // Check if screen is 'Large' (1024px) or smaller
    const checkSize = () => setIsLargeOrSmaller(window.innerWidth <= 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    console.log("HERE IS THE FORMULATION", formulation)
    return () => window.removeEventListener('resize', checkSize);
  }, []);




  const [activeTab, setActiveTab] = useState(null); // 'tools' or 'details' or null

// Helper to handle mutual exclusivity
const toggleTab = (tab) => {
  if (activeTab === tab) {
    setActiveTab(null);
  } else {
    setActiveTab(tab);
  }
};

    // chosen ingredients and nutrients
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [selectedNutrients, setSelectedNutrients] = useState([])

  // Shadow prices (for simplex optimization)
  const [shadowPricingTabOpen, setShadowPricingTabOpen ]= useState(false);

  // un-updated ingredient/nutrient values (when user enters new min/max that has not been optimized yet)
  const [isDirty, setIsDirty] = useState(false)


  const [filterIngredientCode, setFilterIngredientCode] = useState('')

  // Used for showing ingredients and the type of ingredient e.g. roughage, vitamins or concentrate
  // const [groupFilter, setGroupFilter] = useState([])
  const isDisabled = userAccess === 'view'


  const [showRoughageLimits, setShowRoughageLimits] = useState(false);
  const [showConcentrateLimits, setShowConcentrateLimits] = useState(false);
  const [showVitaminLimits, setShowVitaminLimits] = useState(false);

  const [showLimits, setShowLimits] = useState(false)
  
  useEffect(() => {
    if (formulation) {
      setSelectedIngredients(formulation.ingredients || [])
      setSelectedNutrients(formulation.nutrients || [])
      
    }
  }, [formulation])

  useEffect(() => {
    console.log("FORMULATION HERE", formulation)
  }, [])

  // useEffect(() => {
  //   updateWeight(formulation.dmintake || 0)
  // }, [])

  useEffect(() => {
    if (formulation) {
      showNutrientsMissingBasedonIngredientsPresent ();
    }
  }, [formulation, selectedIngredients])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (owner && formulation) {
          await Promise.all([fetchIngredients(), fetchNutrients()]);

        }
      } catch (error) {
        console.log(error)
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
  }, [formulation]);

  useEffect(() => {
    setIsLoading(true)
    fetchCollaboratorData()
    setIsLoading(false)
  }, [formulation.collaborators])

  useEffect(() => {
    isDirty && updateCost(0)
  }, [isDirty])


  // Sync on saving using 'ctrl + s'
  useEffect(() => {
    const handleKeyPress = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault() // Prevent the default browser save action
        handleSave(isDirty) // Call database update function
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isDirty])

  // Function to organize ingredients for Ingredients Menu
  const organizeIngredients = (fetchedData, phase) => {
      setListOfIngredients(fetchedData)
      
      const arr2Ids = new Set(
        phase === 'Custom' ?
          formulation.ingredients.map((item) => item.ingredient_id)
          : specialformulations.find((sf) => sf.name === phase)?.ingredients.map((item) => item.ingredient_id)
      )

      // don't include already added ingredients to the ingredients menu
      const unusedIngredients = fetchedData.filter(
        (item) => !arr2Ids.has(item.ingredient_id || item._id)
      )
      updateIngredientsMenu(unusedIngredients)

      // ingredients in the user's workspace
      const listOfIngredientsIds = new Set(
        fetchedData.map((item) => item.ingredient_id || item._id)
      )
      // remove ingredients in the formulation that are already deleted in the user's workspace
      const nonExistingIngredients = formulation.ingredients.filter(
        (item) => !listOfIngredientsIds.has(item.ingredient_id)
      )
      const nonExistingIngredientsIds = new Set(nonExistingIngredients.map((item) => item.ingredient_id))
      updateIngredients(
        ingredients.filter(
          (item) => !nonExistingIngredientsIds.has(item.ingredient_id)
        )
      )
  }

  const organizeNutrients = (fetchedData, phase) => {

    // nutrients already in the formulation
      const arr2Ids = new Set(
        phase === 'Custom' ?
          formulation.nutrients.map((item) => item.nutrient_id)
          : specialformulations.find((sf) => sf.name === phase)?.nutrients.map((item) => item.nutrient_id)
      )
      // don't include already added nutrients to the nutrients menu
      const unusedNutrients = fetchedData.filter(
        (item) => !arr2Ids.has(item.nutrient_id || item._id)
      )
      updateNutrientsMenu(unusedNutrients)

      // nutrients in the user's workspace
      const listOfNutrientsIds = new Set(
        fetchedData.map((item) => item.nutrient_id || item._id)
      )
      // remove nutrients in the formulation that are already deleted in the user's workspace
      const nonExistingNutrients = formulation.nutrients.filter(
        (item) => !listOfNutrientsIds.has(item.nutrient_id)
      )
      const nonExistingNutrientsIds = new Set(nonExistingNutrients.map((item) => item.nutrient_id))
      updateNutrients(
        nutrients.filter(
          (item) => !nonExistingNutrientsIds.has(item.nutrient_id)
        )
      )
  }
  const fetchIngredients = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/ingredient/filtered/${owner?.userId}?limit=10000`
      )
      const fetchedData = res.data.ingredients
      organizeIngredients(fetchedData, 'Custom')
      
    } catch (err) {
      console.log(err)
    }
  }


  const fetchNutrients = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/nutrient/filtered/${owner?.userId}?limit=10000`
      )
      const fetchedData = res.data.nutrients
      setListOfNutrients(fetchedData)
      organizeNutrients(fetchedData, 'Custom')
    } catch (err) {
      console.log(err)
    }
  }

  const fetchCollaboratorData = async () => {
    try {
      if (!formulation.collaborators) return
      // get details of collaborators
      const collaboratorPromises = formulation.collaborators.map(
        async (collaborator) => {
          const res = await axios.get(
            `${VITE_API_URL}/user-check/id/${collaborator.userId}`
          )
          return {
            ...res.data.user,
            access: collaborator.access,
          }
        }
      )
      // wait for all requests to complete
      const collaboratorsData = await Promise.all(collaboratorPromises)
      setCollaborators(collaboratorsData)
    } catch (err) {
      console.log(err)
    }
  }

  const hideToast = () => {
    setShowToast(false)
    setMessage('')
    setToastAction('')
  }

  const handleOpenShareFormulationModal = () => {
    if (userAccess === 'owner') {
      setIsShareFormulationModalOpen(true)
    } else {
      setShowToast(true)
      setMessage('Only the owner can share the formulation.')
      setToastAction('error')
    }
  }

  const goToConfirmationModal = (type, collaborator, message) => {
    if (type === 'error') {
      // toast instructions
      setShowToast(true)
      setMessage(message)
      setToastAction('error')
    } else if (type === 'linkCopied') {
      setShowToast(true)
      setMessage(message)
      setToastAction('success')
    } else {
      setNewCollaborator(collaborator)
      setIsAddCollaboratorModalOpen(true)
    }
  }

  const [detailedIngredients, setDetailedIngredients] = useState('')
  const [isManualFormulationOpen, setIsManualFormulationOpen] = useState(false)


  const handleManualOptimize = async () => {

    // Get Necessary Formulations
    const nutrients = formulationRealTime?.nutrients || [];
    const ingredients = formulationRealTime?.ingredients || [];
    const dmIntake = formulationRealTime?.dmintake || 0; // The target DM intake

    setIsLoading(true);
    
    try {
      const ids = ingredients.map((ing) => ing.ingredient_id || ing._id);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ingredient/idarray`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

     

      const data = await response.json();
      if (data.message === "success") {
        const detailed = data.ingredients;
        setDetailedIngredients(detailed);
        // --- START OF MANUAL CALCULATION LOGIC ---

        // 1. Map ingredients to their DM values and calculate initial As-Fed
        // Formula: (ratio / DM_value) * 100
        const dmNutrientId = nutrients[nutrients.length - 1]?.nutrient_id || nutrients[nutrients.length - 1]?.id;
        

        
        const preparedData = ingredients.map((ing) => {
          const detail = detailed.find((d) => d._id === (ing.ingredient_id || ing._id));
          const dmValue = detail?.nutrients?.find((n) => n.nutrient === dmNutrientId)?.value || 0;
          const ratio = Number(ing.minimum || 0);
          
          const asFed = dmValue > 0 ? (ratio / dmValue) * 100 : 0;
          return { ...ing, detail, dmValue, asFed };
        });

        

        

        

        const totalAsFed = preparedData.reduce((sum, item) => sum + item.asFed, 0);

        
        // 2. Calculate AsFed100kg and TMR DM
        // Formula: asFed100kg = (asFed / totalAsFed) * 100
        // Formula: TMR_DM = (asFed100kg * dmValue) / 100
        const processedData = preparedData.map((item) => {
          const asFed100kg = totalAsFed > 0 ? (item.asFed / totalAsFed) * 100 : 0;
          const tmrDM = (asFed100kg * item.dmValue) / 100;
          return { ...item, asFed100kg, tmrDM };
        });

        

        

        const totalAsFed100kg = processedData.reduce((sum, item) => sum + item.asFed100kg, 0);
        const totalTMRDM = processedData.reduce((sum, item) => sum + item.tmrDM, 0);

        
        
        
        // 3. Calculate Final totalWeight
        // Formula: ((dmIntake / 100) / totalTMRDM) * 100
        const calculatedTotalWeight = ((formulation.dmintake / 100) / totalTMRDM) * 100;
        
        

        // 4. Calculate Final Ingredient values and Costs
        // Formula: (asFed100kg / totalAsFed100kg) * totalWeight
        let calculatedTotalCost = 0;
        const optimizedIngredients = processedData.map((item) => {
          const finalValueKg = totalAsFed100kg > 0 
            ? (item.asFed100kg / totalAsFed100kg) * calculatedTotalWeight 
            : 0;
          
          const ingredientPrice = Number(item.detail?.price || 0);
          calculatedTotalCost += ingredientPrice * finalValueKg;

          return {
            name: item.name,
            ingredient_id: item.ingredient_id || item._id,
            value: finalValueKg, // Storing as grams for the Modal's display logic
          };
        });

        
        

        // 5. Calculate Final Nutrients (Total Achieved)
        // This maps the actual nutrient contribution based on the final weights
        const optimizedNutrients = nutrients.map((nut) => {
          const nutId = nut.nutrient_id || nut._id;
          const totalNutrientAchieved = processedData.reduce((sum, item, idx) => {
            const ingredientValueGrams = optimizedIngredients[idx].value;
            const nutEntry = item.detail?.nutrients?.find(n => n.nutrient === nutId);
            const nutValue = Number(nutEntry?.value || 0) / 100;
            
            // Contribution: (WeightKG * DM%) * Nutrient%
            const dryMatterKg = (ingredientValueGrams / 1000) * (item.dmValue / 100);
            return sum + (dryMatterKg * nutValue * 1000);
          }, 0);

          return {
            name: nut.name,
            value: totalNutrientAchieved
          };
        });

        
        console.log("CALCULATED TOTAL WEIGHT", optimizationResults, optimizedNutrients)
        // --- FINAL STATE UPDATE ---
        setOptimizationResults({
          ingredients: optimizedIngredients,
          nutrients: optimizedNutrients,
          totalWeight: calculatedTotalWeight,
          totalCost: calculatedTotalCost, 
        });



        console.log("FORMULATION INFO", optimizedIngredients, optimizedNutrients, calculatedTotalWeight, calculatedTotalCost)
      }
    } catch (error) {
      console.error("Error calculating manual formulation:", error);
    } finally {
      setIsLoading(false);
      setIsManualFormulationOpen(true);
    }
  };
  const handleOptimize = async (
    // ingredients,
    // nutrients,
    // weight,
    type
  ) => {
    try {

      // UNCOMMENT/DELETE IF NOT NEEDED
      

      const weight = formulationRealTime?.weight || []
      const nutrients = formulationRealTime?.nutrients || []
      const ingredients = formulationRealTime?.ingredients || []  

      console.log("DEBUG HERE: FRONTEND SENING OF DATA TO SOLVER!")
      console.log("Ingredients", ingredients)
      console.log("Nutrients", nutrients)
      console.log("Weight", weight)
      console.log("Nutrient Ratios", formulation)

      console.log("Selected Nutrients", selectedNutrients)
      // Temporary Fix
      // Function for obtaining value for as-fed amount (weight) of the feed
      // Convert ingredient min and max from kg to grams for API
          const ingredientsInGrams = ingredients.map(ing => ({
            ...ing,
            minimum: ing.minimum * 1000,
            maximum: ing.maximum * 1000,

          }));
      

      let weightinGrams = weight * 1000
      if (weight ===0){
        weightinGrams = ' '
      } 
      weightinGrams = ' '
      
      console.log(weightinGrams, "weightingrams")
      

      
      console.log("Ingredients in grams:", ingredientsInGrams)
      const res = await axios.post(`${VITE_API_URL}/optimize/simplex`, {
        userId: owner?.userId,
        ingredients: ingredientsInGrams,
        nutrients,
        weight: weightinGrams,
        nutrientRatioConstraints,
        type: type
      })

      console.log("Here is the resdata", res.data) // View Optimization results
      const optimizedCost = res.data.optimizedCost
      const optimizedIngredients = res.data.optimizedIngredients
      const optimizedNutrients = res.data.optimizedNutrients

      
      const shadowPricesResult = res.data.shadowPrices
      const amountFed = parseFloat(res.data.weight/1000).toFixed(2)

      console.log("OPTIMIZATION RESULT - AMOUNT FED:", res.data)
      console.log("OPTIMIZATION RESULT:", optimizedIngredients, optimizedNutrients)

      // Update shadow prices in real-time storage
      updateShadowPrices(shadowPricesResult || []);

      updateCost(optimizedCost/1000)
      optimizedIngredients.forEach((ing) => {
          const originalIng = ingredients.find(i => i.name === ing.name);
          if (originalIng) {
            // console.log(`Updating ingredient ${ing.name} with value ${ing.value}`); // Debug log
              // Ensure you use the exact ID used in your state management
              updateIngredientProperty(originalIng.ingredient_id, 'value', Number(ing.value)/1000);
          }
      });
      optimizedNutrients.forEach((nut) => {
        const nutrientId = nutrients.find(n => n.name === nut.name)?.nutrient_id;
        if (nutrientId){
          updateNutrientProperty(nutrientId, 'value', Number(nut.value))
        }
      })
      updateWeight(amountFed)

      setOptimizationResults({
        ingredients: optimizedIngredients,
        nutrients: optimizedNutrients,
        totalWeight: amountFed,
        totalCost: optimizedCost / 1000,
        
      });

      console.log("Optimization Results:", optimizedNutrients, optimizedIngredients)

      // 2. Open the results modal
      setIsResultsModalOpen(true);
      
      setIsDirty(false)
      setMessage(`Formulation Creator`)
    } catch (err) {
      if (err.response?.data?.status === 'No optimal solution') {
        // toast instructions
        setShowToast(true)
        setMessage(`No feasible formula found. Please adjust your constraints.`)
        setToastAction('error')
        ingredients.map((ing, index) => {
          const ingredientId = ingredients.find(i => i.name === ing.name)?.ingredient_id;
          updateIngredientProperty(ingredientId, 'value', 0)
        })
        nutrients.map((ing, index) => {
          const nutrientId = nutrients.find(n => n.name === ing.name)?.nutrient_id;
          updateNutrientProperty(nutrientId, 'value', 0)
        })
      }
    }
  }

  const handleAddCollaborator = async () => {
    try {
      await axios.put(
        `${VITE_API_URL}/formulation/collaborator/${id}`,
        {
          updaterId: user._id,
          collaboratorId: newCollaborator.newId,
          access: newCollaborator.newAccess,
          displayName: newCollaborator.newDisplayName,
        }
      )
      
      const newCollaboratorData = {
        _id: newCollaborator.newId,
        email: newCollaborator.newEmail,
        access: newCollaborator.newAccess,
        profilePicture: newCollaborator.newProfilePicture,
        displayName: newCollaborator.newDisplayName,
      }
      setCollaborators([...collaborators, newCollaboratorData])
      setShowToast(true)
      setMessage('Collaborator added successfully')
      setToastAction('success')
    } catch (err) {
      console.log(err)
    }
  }

  const handleUpdateCollaborator = (updatedCollaborators) => {
    setCollaborators(updatedCollaborators)
    setShowToast(true)
    setMessage('Collaborator updated successfully')
    setToastAction('success')
  }

  const handleDeleteCollaborator = async (collaboratorId) => {
    try {
      await axios.delete(
        `${VITE_API_URL}/formulation/collaborator/${id}/${collaboratorId}`
      )
      setCollaborators(
        collaborators.filter(
          (collaborator) => collaborator._id !== collaboratorId
        )
      )
      setShowToast(true)
      setMessage('Collaborator deleted successfully')
      setToastAction('success')
    } catch (err) {
      console.log(err)
    }
  }

  const handleAddIngredients = async (ingredientsToAdd) => {
    try {
       const ingredientsWithGroup = ingredientsToAdd.map((ingredient) => {
        const matched = ingredientsMenu.find(
          (item) =>
            item._id === ingredient.ingredient_id ||
            item.ingredient_id === ingredient.ingredient_id
        );
        return {
          ...ingredient,
          group: matched?.group || "", // add group if found
        };
      });

      const res = await axios.put(
        `${VITE_API_URL}/formulation/ingredients/${id}`,
        { ingredients: ingredientsWithGroup } // send ingredients with group
      );
      
      const newIngredients = res.data.addedIngredients
      
      const formattedIngredients = newIngredients.map((ingredient) => {
        // at initial add, all values are zero
        const menuIngredient = ingredientsMenu.find(
          (item) => item.ingredient_id === ingredient.ingredient_id || item._id === ingredient.ingredient_id
        );
        
        
        return {
          ...ingredient,
          minimum: 0,
          maximum: 0,
          value: 0,
          group: menuIngredient?.group || ''
        }
      })

      setSelectedIngredients([...selectedIngredients, ...formattedIngredients])
      const arr2Ids = new Set(
        formattedIngredients.map((item) => item.ingredient_id)
      )
      updateIngredientsMenu(ingredientsMenu.filter((item) => !arr2Ids.has(item.ingredient_id || item._id)))
      updateCost(0)
      updateIngredients([...selectedIngredients, ...formattedIngredients])
      setIsChooseIngredientsModalOpen(false)
      setIsDirty(false)
      // toast instructions
      setShowToast(true)
      setMessage('Ingredients added successfully')
      setToastAction('success')
    } catch (err) {
      console.log(err)
      // toast instructions
      setShowToast(true)
      setMessage('Error adding ingredients')
      setToastAction('error')
    }
  }

  const handleAddNutrients = async (nutrientsToAdd) => {
    try {
      const res = await axios.put(
        `${VITE_API_URL}/formulation/nutrients/${id}`,
        { nutrients: nutrientsToAdd }
      )
      
      const newNutrients = res.data.addedNutrients
      // at initial add, all values are zero
      const formattedNutrients = newNutrients.map((nutrient) => {
        return {
          ...nutrient,
          minimum: 0,
          maximum: 0,
          value: 0,
        }
      })
      setSelectedNutrients([...selectedNutrients, ...formattedNutrients])
      console.log(formattedNutrients, 
        "Formated nutrei"
      )
      const arr2Ids = new Set(
        formattedNutrients.map((item) => item.nutrient_id)
      )
      updateNutrientsMenu(nutrientsMenu.filter((item) => !arr2Ids.has(item.nutrient_id || item._id)))
      updateCost(0)
      updateNutrients([...selectedNutrients, ...formattedNutrients])
      setIsChooseNutrientsModalOpen(false)
      setIsDirty(false)
      // toast instructions
      setShowToast(true)
      setMessage('Nutrients added successfully')
      setToastAction('success')
    } catch (err) {
      console.log(err)
      // toast instructions
      setShowToast(true)
      setMessage('Error adding nutrients')
      setToastAction('error')
    }
  }

  const handleRemoveIngredient = async (ingredientToRemove) => {
    try {
      await axios.delete(
        `${VITE_API_URL}/formulation/ingredients/${id}/${ingredientToRemove.ingredient_id}`
      )
      // remove ingredientToRemove from selected ingredients
      setSelectedIngredients(
        selectedIngredients.filter(
          (item) => item.ingredient_id !== ingredientToRemove.ingredient_id
        )
      )
      updateIngredients(
        ingredients.filter(
          (item) => item.ingredient_id !== ingredientToRemove.ingredient_id
        )
      )
      // add ingredientToRemove to ingredients menu
      const removedIngredient = listOfIngredients.find((item) =>
        item.ingredient_id
          ? item.ingredient_id === ingredientToRemove.ingredient_id
          : item._id === ingredientToRemove.ingredient_id
      )
      if (removedIngredient) {
        updateIngredientsMenu([removedIngredient, ...ingredientsMenu])
      }
      updateCost(0)
      setIsDirty(false)
      // toast instructions
      setShowToast(true)
      setMessage('Ingredient removed successfully')
      setToastAction('success')
    } catch (err) {
      console.log(err)
      // toast instructions
      setShowToast(true)
      setMessage('Error removing ingredient')
      setToastAction('error')
    }
  }

  const handleRemoveNutrient = async (nutrientToRemove) => {
    try {
      await axios.delete(
        `${VITE_API_URL}/formulation/nutrients/${id}/${nutrientToRemove.nutrient_id}`
      )
      // remove nutrientToRemove from selected nutrients
      setSelectedNutrients(
        selectedNutrients.filter(
          (item) => item.nutrient_id !== nutrientToRemove.nutrient_id
        )
      )
      updateNutrients(
        nutrients.filter(
          (item) => item.nutrient_id !== nutrientToRemove.nutrient_id
        )
      )
      // add nutrientToRemove to nutrients menu
      const removedNutrient = listOfNutrients.find((item) =>
        item.nutrient_id
          ? item.nutrient_id === nutrientToRemove.nutrient_id
          : item._id === nutrientToRemove.nutrient_id
      )
      if (removedNutrient) {
        updateNutrientsMenu([removedNutrient, ...nutrientsMenu])
      }
      // Remove any nutrient ratio constraints that has this particular nutrient (real-time update)
      const filteredConstraints = (nutrientRatioConstraints || []).filter(
        (constraint) =>
          constraint.firstIngredientId !== nutrientToRemove.nutrient_id &&
          constraint.secondIngredientId !== nutrientToRemove.nutrient_id
      )
      if (filteredConstraints.length !== (nutrientRatioConstraints || []).length) {
        updateNutrientRatioConstraints(filteredConstraints)
      }
      updateCost(0)
      setIsDirty(false)
      // toast instructions
      setShowToast(true)
      setMessage('Nutrient removed successfully')
      setToastAction('success')
    } catch (err) {
      console.log(err)
      // toast instructions
      setShowToast(true)
      setMessage('Error removing nutrient')
      setToastAction('error')
    }
  }

  const handleIngredientMinimumChange = (index, value) => {
    value === 'N/A' || value === ''
      ? updateIngredientProperty(index, 'minimum', 0)
      : updateIngredientProperty(index, 'minimum', value)
  }

  const handleIngredientMaximumChange = (index, value) => {
    value === 'N/A' || value === ''
      ? updateIngredientProperty(index, 'maximum', 0)
      : updateIngredientProperty(index, 'maximum', value)
  }

  const handleNutrientMinimumChange = (index, value) => {
    value === 'N/A' || value === ''
      ? updateNutrientProperty(index, 'minimum', 0)
      : updateNutrientProperty(index, 'minimum', value)
  }

  const handleNutrientMaximumChange = (index, value) => {
    value === 'N/A' || value === ''
      ? updateNutrientProperty(index, 'maximum', 0)
      : updateNutrientProperty(index, 'maximum', value)
  }

  // Render function for Ingredients table rows
  const renderIngredientsTableRows = (group) => {
        // Ingredients Filtering Roughage, or vitamins, or concentrate

      const groupFilter1 = ["grass", "legumes"]
      const groupFilter2 = ["agricultural by-products", "industrial by-products"]
      const groupFilter3 = ["vitamin-mineral"]

      
      const filtered = ingredients.filter(
        (ingredient) => {
          if (group === 'roughage') {
            return groupFilter1.some((g) => ingredient.group?.toLowerCase().includes(g.toLowerCase()))
          } else if (group === 'concentrate') {
            return groupFilter2.some((g) => ingredient.group?.toLowerCase().includes(g.toLowerCase()))
          } else if (group === 'vitamins') {
            return groupFilter3.some((g) => ingredient.group?.toLowerCase().includes(g.toLowerCase()))
          } else {
            return ingredient
          }
        }
      )
    // Determine which state to check based on the group name
    const isLimitVisible = 
      group === 'roughage' ? showRoughageLimits : 
      group === 'concentrate' ? showConcentrateLimits : 
      group === 'vitamins' ? showVitaminLimits :
      showVitaminLimits; // for 'vitamins'
    if (filtered.length > 0) {
      return filtered.map((ingredient, index) => (
        <tr key={index} className="hover:bg-base-200 transition-colors border-b border-gray-50">
          <td className="font-medium text-gray-700">{ingredient.name}</td>
          
          {isLimitVisible && (
            <>
              <td className="text-center">
                <input
                  type="text"
                  className="input input-bordered input-xs w-16 text-center rounded-md"
                  disabled={isDisabled}
                  value={ingredient.minimum !== 0 ? ingredient.minimum : 'N/A'}
                  onChange={(e) => {
                const inputValue = e.target.value
                // in consideration for 'N/A' values which means 0
                if (
                  /^N\/A(\d+|\.)/.test(inputValue) ||
                  /^\d*\.?\d{0,2}$/.test(inputValue)
                ) {
                  // to allow rewriting of input if user types a number after clicking on input with 'N/A'
                  const processedValue = /^N\/A\d*/.test(inputValue)
                    ? inputValue.replace('N/A', '')
                    : inputValue
                  handleIngredientMinimumChange(ingredient.ingredient_id, processedValue)
                  setIsDirty(false)
                }
              }}
                />
              </td>
              <td className="text-center">
                <input
                  type="text"
                  className="input input-bordered input-xs w-16 text-center rounded-md"
                  disabled={isDisabled}
                  value={ingredient.maximum !== 0 ? ingredient.maximum : 'N/A'}
                  onChange={(e) => {
                const inputValue = e.target.value
                // in consideration for 'N/A' values which means 0
                if (
                  /^N\/A(\d+|\.)/.test(inputValue) ||
                  /^\d*\.?\d{0,2}$/.test(inputValue)
                ) {
                  // to allow rewriting of input if user types a number after clicking on input with 'N/A'
                  const processedValue = /^N\/A\d*/.test(inputValue)
                    ? inputValue.replace('N/A', '')
                    : inputValue
                  handleIngredientMaximumChange(ingredient.ingredient_id, processedValue)
                  setIsDirty(false)
                }
              }}
                />
              </td>
            </>
          )}

          {/* Updated Amount Display with "kg" */}
          <td className="font-semibold text-gray-800">
            {ingredient && weight 
              ? `${(ingredient.value).toFixed(3)} kg` 
              : "0.000 kg"}
          </td>

          <td className="text-right">
            <button
              disabled={isDisabled}
              className={`${isDisabled ? 'hidden' : ''} btn btn-ghost btn-xs text-red-500 hover:bg-red-100 rounded-lg`}
              onClick={() => handleRemoveIngredient(ingredient)}
            >
              <RiDeleteBinLine size={14} />
            </button>
          </td>
        </tr>
      ))
    }
  }


  // Render function for Nutrients table rows
  
  const renderNutrientsTableRows = () => {
    
    if (nutrients) {
      return nutrients.map((nutrient, index) => (
        <tr key={nutrient.nutrient_id} className="hover:bg-base-300">
          <td>{nutrient.name}</td>
          <td>
            <input
              type="text"
              className="input input-bordered input-xs w-15"
              disabled={isDisabled}
              value={nutrient.minimum !== 0 ? nutrient.minimum : 'N/A'}
              onChange={(e) => {
                const inputValue = e.target.value
                // in consideration for 'N/A' values which means 0
                if (
                  /^N\/A(\d+|\.)/.test(inputValue) ||
                  /^\d*\.?\d{0,2}$/.test(inputValue)
                ) {
                  // to allow rewriting of input if user types a number after clicking on input with 'N/A'
                  const processedValue = /^N\/A\d*/.test(inputValue)
                    ? inputValue.replace('N/A', '')
                    : inputValue
                  handleNutrientMinimumChange(nutrient.nutrient_id, processedValue)
                  setIsDirty(false)
                }
              }}
              onFocus={() =>
                updateMyPresence({ focusedId: `nutrient-${index}-minimum` })
              }
              onBlur={() => updateMyPresence({ focusedId: null })}
            />
            <Selections id={`nutrient-${index}-minimum`} others={others} />
          </td>
          <td>
            <input
              type="text"
              className="input input-bordered input-xs w-15"
              disabled={isDisabled}
              value={nutrient.maximum !== 0 ? nutrient.maximum : 'N/A'}
              onChange={(e) => {
                const inputValue = e.target.value
                // in consideration for 'N/A' values which means 0
                if (
                  /^N\/A(\d+|\.)/.test(inputValue) ||
                  /^\d*\.?\d{0,2}$/.test(inputValue)
                ) {
                  // to allow rewriting of input if user types a number after clicking on input with 'N/A'
                  const processedValue = /^N\/A\d*/.test(inputValue)
                    ? inputValue.replace('N/A', '')
                    : inputValue
                  handleNutrientMaximumChange(nutrient.nutrient_id, processedValue)
                  setIsDirty(false)
                }
              }}
              onFocus={() =>
                updateMyPresence({ focusedId: `nutrient-${index}-maximum` })
              }
              onBlur={() => updateMyPresence({ focusedId: null })}
            />
            <Selections id={`nutrient-${index}-maximum`} others={others} />
          </td>
          <td>{nutrient.value.toFixed(3)}</td>
          <td>
            <button
              disabled={isDisabled}
              className={`${isDisabled ? 'hidden' : ''} btn btn-ghost btn-xs text-red-500 hover:bg-red-200`}
              onClick={() => handleRemoveNutrient(nutrient)}
            >
              <RiDeleteBinLine />
            </button>
          </td>
        </tr>
      ))
    }
  }

  // Render function for Nutrient Ratios table rows
  const renderNutrientRatiosTableRows = () => {
    
    if (nutrientRatioConstraints) {
      return nutrientRatioConstraints.map((nutrient, index) => (
        <tr key={index} className="hover:bg-base-300">
          <td className="w-1/5">{nutrient.firstIngredient}</td>
          <td className="w-1/5">{nutrient.secondIngredient}</td>
          <td className="w-1/5 text-center">{nutrient.operator || '='}</td>
          <td className="w-1/5 text-center">{nutrient.firstIngredientRatio} : {nutrient.secondIngredientRatio}</td>
          <td className="w-1/5 text-center">
            <div className="flex items-center justify-center gap-2">
              <button className='btn btn-ghost btn-xs text-deepbrown hover:bg-deepbrown/10 items-center gap-1'
                disabled={isDisabled}
                onClick={() => handleEditNutrientRatio(index)}
              >
                <RiPencilLine className='h-4 w-4 text-deepbrown'/>
              </button>
              <button
                disabled={isDisabled}
                className={`${isDisabled ? 'hidden' : ''} btn btn-ghost btn-xs text-red-500 hover:bg-red-200 ml-1`}
                onClick={() => handleDeleteNutrientRatio(index)}
              >
                <RiDeleteBinLine />
              </button>
            </div>
          </td>
        </tr>
      ))
    }
  }
  const [phase, setPhase] = useState('Custom');

  const ChangeFormulationByPhase = (phase) => {
    
    setPhase(phase);
    if (phase === 'Custom') {
      // Custom phase logic
      updateWeight(formulation.weight);
      updateCost(formulation.cost);
      organizeIngredients(listOfIngredients, phase)
      organizeNutrients(listOfNutrients, phase)
      updateIngredients(formulation.ingredients || []);
      updateNutrients(formulation.nutrients || []);
      ;
    } else {
      const selectedPhase = specialformulations.find(sf => sf.name === phase);
      if (selectedPhase) {
        // Update the formulation with the selected phase data
        updateWeight(selectedPhase.weight);
        updateCost(selectedPhase.cost);
        organizeIngredients(listOfIngredients, phase)
        organizeNutrients(listOfNutrients, phase)
        updateIngredients(selectedPhase.ingredients || []);
        updateNutrients(selectedPhase.nutrients || []);
        ;
      }
    }
  }

  // Dummy data for future testing (not used in UI)
  // eslint-disable-next-line no-unused-vars
  const dummyNutrientRatioConstraintSamples = {
    id: 1,
    name: "Starter Feed",
    ingredients: [
      { name: "Corn", percentage: 50 },
      { name: "Soybean Meal", percentage: 30 },
      { name: "Fish Meal", percentage: 10 },
      { name: "Premix", percentage: 10 }
    ],
    nutrientConstraints: {
      protein: { min: 20, max: 24 },
      fat: { min: 3, max: 5 },
      fiber: { min: 2, max: 5 },
      calcium: { min: 0.8, max: 1.2 },
      phosphorus: { min: 0.4, max: 0.6 }
    },
    nutrientRatioConstraints: [
      {
        firstIngredient: "Protein",
        secondIngredient: "Fat",
        operator: "=", 
        firstIngredientRatio: 2,
        secondIngredientRatio: 1
      },
      {
        firstIngredient: "Calcium",
        secondIngredient: "Phosphorus",
        operator: ">=", 
        firstIngredientRatio: 3,
        secondIngredientRatio: 2
      },
    ]
  };
  const [nutrientRatioModifyType, setNutrientRatioModifyType] = useState('add');
  const [editingNutrientRatioIndex, setEditingNutrientRatioIndex] = useState(null); // NEW: track which ratio is being edited
  const [nutrientRatioToEdit, setNutrientRatioToEdit] = useState(null); // NEW: store the ratio being edited
  const [missingNutrientsValue, setMissingNutrientsValue] = useState([]);
  const [advancedPressed, setAdvancedPressed] = useState(false);
  const [progressPressed, setProgressPressed] = useState(false);
  // Handler to open modal for editing a nutrient ratio
  const handleEditNutrientRatio = (index) => {
    setEditingNutrientRatioIndex(index);
    setNutrientRatioToEdit(nutrientRatioConstraints[index]);
    setNutrientRatioModifyType('Edit');
    setIsChooseNutrientRatiosModalOpen(true);
  };

  // Handler to update a nutrient ratio in the list
  const handleUpdateNutrientRatio = (updatedRatio) => {
    const updatedConstraints = [...nutrientRatioConstraints];
    updatedConstraints[editingNutrientRatioIndex] = updatedRatio;
    updateNutrientRatioConstraints(updatedConstraints);
    setEditingNutrientRatioIndex(null);
    setNutrientRatioToEdit(null);
  };

  // Handler to delete a nutrient ratio
  const handleDeleteNutrientRatio = (index) => {
    const updatedConstraints = nutrientRatioConstraints.filter((_, i) => i !== index);
    updateNutrientRatioConstraints(updatedConstraints);
  };

  // loading due to api calls
  if (isLoading || formulation.length === 0 || !owner) {
    return <Loading />
  }
  // loading due to liveblocks storage
  if (!formulationRealTime) {
    return <Loading />
  }


  function showNutrientsMissingBasedonIngredientsPresent() {
    console.log("SELECTED INGREDIENTS HERE: ", selectedIngredients)

    if (selectedIngredients.length === 0) {
      setMissingNutrientsValue((formulation.nutrients || []).map(n => n.name));
      return;
    }

    // ✅ Extract IDs instead of names
    const ingredientIds = selectedIngredients.map(ing => ing.ingredient_id || ing._id);

    console.log("ingredint", ingredientIds)

    axios.post(`${import.meta.env.VITE_API_URL}/ingredient/idarray`, {
      ids: ingredientIds
    })
      .then(res => res.data.ingredients)
      .then(ingredientswithnutri => {
        console.log("Fetched Ingredients here:", ingredientswithnutri)

        if (!ingredientswithnutri || ingredientswithnutri.length === 0) {
          setMissingNutrientsValue((formulation.nutrients || []).map(n => n.name));
          return;
        }

        // Initialize all nutrients to 0
        const allNutrientInFormulationId = (formulation.nutrients || []).reduce((acc, nutrient) => {
          acc[nutrient.nutrient_id] = 0;
          return acc;
        }, {});

        // Sum nutrient values
        (formulation.nutrients || []).forEach(formulationnutrient => {
          ingredientswithnutri.forEach(ingredient => {
            (ingredient.nutrients || []).forEach(nutrient => {
              if (nutrient.nutrient === formulationnutrient.nutrient_id) {
                allNutrientInFormulationId[nutrient.nutrient] += (nutrient.value || 0);
              }
            });
          });
        });

        // Find missing nutrients
        const missingNutrients = Object.entries(allNutrientInFormulationId)
          .filter(([_, value]) => value === 0)
          .map(([nutrientId]) => {
            const nutrientObj = (formulation.nutrients || []).find(
              n => n.nutrient_id === nutrientId
            );
            return nutrientObj ? nutrientObj.name : `Nutrient ID: ${nutrientId}`;
          });

        setMissingNutrientsValue(missingNutrients);
      })
      .catch(err => {
        console.error("Error fetching ingredients by IDs:", err);
      });
  }

  const {
    weight,
    code,
    name,
    description,
    animal_group,
    cost
  } = formulationRealTime

  const nutrients = formulationRealTime?.nutrients || []
  const ingredients = formulationRealTime?.ingredients || []  
  
  return (
    <div className="flex h-full flex-col bg-gray-50 md:flex-row">


  

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">

        <h1 className="text-deepbrown text-xl font-bold md:text-2xl">
        Feed Formulation (Single)
      </h1>
      <div className="flex flex-row items-center space-x-2 md:space-x-4 mb-4 overflow-x-auto no-scrollbar">
              {/* STEP 1 */}
              <div className="flex items-center gap-2 shrink-0">
                <h1 className="text-gray-300 text-xs font-bold md:text-sm uppercase tracking-wider">
                  Select/Create
                </h1>
                <RiArrowRightSLine className="text-gray-300 h-5 w-5" />
              </div>
      
              {/* STEP 2 - ACTIVE */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center">
                  <h1 className="text-deepbrown text-xs font-bold md:text-sm uppercase tracking-wider">
                    Formulate
                  </h1>
                  {/* Visual underline signifier for active state */}
                  <div className="h-1 w-full bg-deepbrown rounded-full mt-0.5 animate-pulse" />
                </div>
                <RiArrowRightSLine className="text-gray-300 h-5 w-5" />
              </div>
      
              {/* STEP 3 */}
              <div className="flex items-center gap-2 shrink-0">
                <h1 className="text-gray-300 text-xs font-bold md:text-sm uppercase tracking-wider">
                  Generate
                </h1>
              </div>
            </div>

      
      
      
      {/* 2. TOGGLE BUTTONS ROW (Visible on Large and Smaller) */}
      {isLargeOrSmaller && (
        <div className="flex items-center gap-2">
          {/* Tools Toggle */}
          <button 
            onClick={() => toggleTab('tools')}
            className={`btn btn-sm border rounded-xl gap-2 transition-all ${
              activeTab === 'tools' 
                ? 'bg-deepbrown text-white border-deepbrown' 
                : 'bg-white text-deepbrown border-gray-200'
            }`}
          >
            <RiSettings4Line className={activeTab === 'tools' ? 'rotate-90' : ''} />
            <span className="text-xs">Compute</span>
            <RiArrowDownSLine className={activeTab === 'tools' ? 'rotate-180' : ''} />
          </button>

          {/* Details Toggle */}
          <button 
            onClick={() => toggleTab('details')}
            className={`btn btn-sm border rounded-xl gap-2 transition-all ${
              activeTab === 'details' 
                ? 'bg-deepbrown text-white border-deepbrown' 
                : 'bg-white text-deepbrown border-gray-200'
            }`}
          >
            <RiInformationLine className={activeTab === 'details' ? 'text-white' : 'text-green-button'} />
            <span className="text-xs">Details</span>
            <RiArrowDownSLine className={activeTab === 'details' ? 'rotate-180' : ''} />
          </button>
        </div>
      )}
    </div>

    {/* --- COLLAPSIBLE CONTENT AREA --- */}
    <div className="relative">
      
      {/* 3. TOOLS / COMPUTE PANEL */}
      <AnimatePresence>
        {(activeTab === 'tools' || !isLargeOrSmaller) && (
          <motion.div
          initial={isLargeOrSmaller ? { height: 0, opacity: 0 } : false}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="relative z-[30]" 
      style={{ overflow: 'visible' }}
        >
          {/* --- COMPUTE / TOOLS TOOLBAR --- */}
<div className="relative z-20 flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm md:mb-2">

  {/* SECTION A: Share & Save (Right side on SM+, Top row on narrow Mobile) */}
  <div className="flex items-center justify-between sm:justify-end gap-3 pb-2 sm:pb-0 border-b border-gray-50 sm:border-none">
    {/* Avatars */}
    <div className="flex space-x-2 shrink-0">
      {others.map(({ connectionId, info }) => (
        <Avatar key={connectionId} src={info.avatar} name={info.name} />
      ))}
      <Avatar src={self.info.avatar} name="You" />
    </div>

    {/* Primary Actions */}
    <div className="flex items-center gap-2">
      <button 
        onClick={handleOpenShareFormulationModal} 
        className="btn btn-ghost btn-sm border border-gray-300 gap-2 rounded-xl text-xs font-medium"
      >
        <RiShareLine /> <span className="hidden xs:inline">Share</span>
      </button>
      <button 
        onClick={() => handleSave(isDirty)} 
        className="btn bg-green-button border-none btn-sm gap-2 rounded-xl text-xs text-white hover:bg-green-600 shadow-sm transition-all active:scale-95"
      >
        <RiSave2Line className="h-4 w-4" /> <span>Save</span>
      </button>
    </div>
  </div>

  {/* SECTION B: Core Tools (Left side on SM+, Bottom row on narrow Mobile) */}
  <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          
          {/* Optimize Dropdown */}

          {constraintMode !== 'percent' &&(
            <div className="dropdown dropdown-bottom dropdown-start">
            <div tabIndex={0} role="button" className="btn bg-green-button border-none text-white btn-sm gap-2 rounded-xl shadow-sm">
              <RiCalculatorLine /> <span className="inline">Optimize</span>
            </div>
            {/* 4. High Z-index ensures it floats over the content below */}
            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[100] w-52 p-2 shadow-xl border border-base-200 mt-2">
              <li><button className="py-2.5 text-xs" onClick={() => handleOptimize('simplex')}>Simplex Feed Ratio</button></li>
              <li><button className="py-2.5 text-xs" onClick={() => handleOptimize('simplex-dry-matter')}>Simplex Dry Matter</button></li>
            </ul>
          </div>

          )}
          

          



            <GenerateReport className='z-[9999]'
                  userAccess={userAccess}
                  formulation={formulationRealTime}
                  owner={owner}
                  weight={weight}
                  shadowPrices={shadowPrices}
                  isCustomizationModalOpen={isCustomizationModalOpen}
                  setIsCustomizationModalOpen={setIsCustomizationModalOpen}
            />

          {optimizationResults && (
    <div className="hidden lg:flex items-center gap-2">
      <button 
        className="btn border-green-200 bg-green-50 hover:bg-green-100 btn-sm gap-2 rounded-xl text-xs px-3 font-bold text-green-700 transition-all" 
        onClick={() => setIsResultsModalOpen(true)}
      >
        <RiHistoryLine className="animate-pulse" /> Latest Results
      </button>
    </div>
  )}

          <div className="flex items-center gap-2">
            <div className="dropdown dropdown-bottom dropdown-end lg:hidden">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm border border-gray-300 rounded-xl px-2">
                <RiMore2Fill size={20} className="text-deepbrown" />
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[100] w-48 p-2 shadow-xl border border-base-200 mt-2">
                <li><button className="text-xs" onClick={() => setShadowPricingTabOpen(true)}><RiLineChartLine /> Shadow Prices</button></li>
                <li><button className="text-xs" onClick={() => setAdvancedPressed(!advancedPressed)}><RiSettings4Line /> {advancedPressed ? 'Show Basic' : 'Show Advanced'}</button></li>
                <li><button className="text-xs" onClick={() => setProgressPressed(!progressPressed)}><RiBarChartLine /> Show Progress</button></li>

              </ul>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <button className="btn border border-gray-300 bg-white btn-sm gap-2 rounded-xl text-xs px-3 font-medium" onClick={() => setShadowPricingTabOpen(true)}>
                <RiLineChartLine /> Shadow Prices
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <button className="btn border border-gray-300 bg-white btn-sm gap-2 rounded-xl text-xs px-3 font-medium" onClick={() => setAdvancedPressed(!advancedPressed)}>
                <RiSettings4Line />  {advancedPressed ? 'Show Basic' : 'Show Advanced'}
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <button 
                className="btn border border-gray-300 bg-white btn-sm gap-2 rounded-xl text-xs px-3 hover:bg-gray-50 text-deepbrown font-medium" 
                onClick={() => setProgressPressed(!progressPressed)}
              >
                <RiBarChartLine /> Progress
            </button>
            </div>
            
          </div>
        </div>
</div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* 4. DETAILS / CARABAO INFO PANEL */}
      <AnimatePresence>
  {(activeTab === 'details' || (!isLargeOrSmaller && window.innerWidth >= 768)) && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm"
    >
      {/* Header Section */}
      <div className="px-4 md:px-6 pt-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-deepbrown uppercase tracking-wider">Formulation Summary</h3>
          {/* Toggle Button for Laptop */}
          <button 
            onClick={() => setShowAllDetails(!showAllDetails)}
            className="hidden md:flex btn btn-ghost btn-xs text-deepbrown/50 hover:bg-gray-100 gap-1 normal-case"
          >
            {showAllDetails ? 'Show less' : 'View more details'}
            <svg 
              className={`transition-transform duration-200 ${showAllDetails ? 'rotate-180' : ''}`}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            ><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
        
        <button 
          className="btn btn-ghost btn-sm text-deepbrown hover:bg-blue-50 gap-2 rounded-lg"
          onClick={() => setIsEditModalOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          Edit/Update Parameters
        </button>
      </div>

      <div className="p-4 md:p-6">
        {/* Primary Info Grid (Always Visible) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
          <div className="col-span-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Name</p>
            <p className="text-sm font-semibold text-deepbrown truncate">{formulation.name || '—'}</p>
          </div>

          <div className="col-span-1 md:col-span-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Animal Group</p>
            <p className="text-sm font-semibold text-deepbrown">{formulation.animal_group || '—'}</p>
          </div>

          <div className="col-span-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Body Weight</p>
            <p className="text-sm font-semibold text-deepbrown">
              {formulation.body_weight || 0} <span className="text-xs font-normal text-gray-500">kg</span>
            </p>
          </div>
        </div>

        {/* Collapsible Secondary Info */}
        <motion.div
          initial={false}
          animate={{ height: (showAllDetails || window.innerWidth < 768) ? "auto" : 0, opacity: (showAllDetails || window.innerWidth < 768) ? 1 : 0 }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-gray-50">
            <div className="col-span-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Code</p>
              <p className="text-sm font-semibold text-deepbrown">{formulation.code || '—'}</p>
            </div>

            <div className="col-span-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">DM Intake</p>
              <p className="text-sm font-semibold text-deepbrown">
                {formulation.dmintake || 0} <span className="text-xs font-normal text-gray-500">kg/d</span>
              </p>
            </div>

            {/* Note: Standardized string to "Inahing kalabaw" to match your logic check */}
            {(formulation.animal_group === "Cow | Inahing kalabaw" || formulation.animal_group === "Heifer | Dumalaga") && (
              <div className="col-span-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Pregnancy</p>
                <div className="inline-flex items-center gap-1.5 text-deepbrown font-bold text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  {formulation.pregnant_phase > 8 ? `Late (${formulation.pregnant_phase}m)` : 
                   formulation.pregnant_phase > 0 ? `Early (${formulation.pregnant_phase}m)` : 
                   formulation.pregnant_phase === 0 ? "Not Pregnant" : "No info"}
                </div>
              </div>
            )}

            {formulation.animal_group === "Cow | Inahing kalabaw" && (
              <>
                <div className="col-span-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Lactation</p>
                  <p className="text-sm font-bold text-blue-700">{formulation.lactating_phase || '—'}</p>
                </div>

                <div className="col-span-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Milk Yield</p>
                  <p className="text-sm font-bold text-green-700">
                    {formulation.milkYieldProgress?.length > 0 
                      ? formulation.milkYieldProgress[formulation.milkYieldProgress.length - 1] 
                      : 0} 
                    <span className="text-xs font-normal opacity-70 ml-1">L/day</span>
                  </p>
                </div>
              </>
            )}

            <div className="col-span-2 md:col-span-4 lg:col-span-6">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Description</p>
              <p className="text-sm text-deepbrown italic">
                {formulation.description || "No description provided."}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
    </div>

    {/* 5. DIRTY ALERT */}
    {isDirty && (
      <div className="alert alert-error alert-soft text-sm py-2">
        <Warning />
        <span>Formula constraints changed. Optimize and Save.</span>
      </div>
    )}
  </div>
          
          {/* This is where you place your Gestational Phases */}

          
                
                {/* Tables - Grid on desktop, Stack on mobile */}
          {/* Box showing missing nutrients after optimization */}
          {missingNutrientsValue.length > 0  && (
            <div className="my-4">
              <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 shadow-sm">
                <div className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                  <Warning /> Nutrients Still Missing
                </div>
                <ul className="list-disc pl-5 text-sm text-yellow-800">
                    {missingNutrientsValue.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                </ul>
              </div>
            </div>
          )
          }
          { !advancedPressed ? (<>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Roughage Table */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="p-4 pb-2">
                  <h3 className="mb-1 text-sm font-semibold">Roughage (Approx. 70% of total feed)</h3>
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Info /> Contains Grasses, Legumes, and other by-products.
                  </p>
                  
                  {/* The Toggle Checkbox - Styled to match your theme */}
                  <div className="mt-3 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="toggle-roughage-limits"
                      className="checkbox checkbox-success checkbox-xs rounded-md" 
                      checked={showRoughageLimits}
                      onChange={(e) => setShowRoughageLimits(e.target.checked)}
                    />
                    <label htmlFor="toggle-roughage-limits" className="cursor-pointer text-[11px] font-medium text-gray-600 uppercase tracking-wider">
                      Add/Show Amount Limit
                    </label>
                  </div>
                </div>

                <div className="max-h-64 overflow-x-auto overflow-y-auto">
                  <table className="table-sm table-pin-rows table w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th>Name</th>
                        {showRoughageLimits && (
                          <>
                            <th className="text-center">Min</th>
                            <th className="text-center">Max</th>
                          </>
                        )}
                        <th>Amount</th>
                        
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>{renderIngredientsTableRows('roughage')}</tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-gray-100">
                  <button
                    disabled={isDisabled}
                    onClick={() => {setIsChooseIngredientsModalOpen(true); setFilterIngredientCode('roughage')}}
                    className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    <RiAddLine /> Add Roughage
                  </button>
                </div>
              </div>


            {/* COncentrate Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="p-4">
                <h3 className="mb-1 text-sm font-semibold">Concentrate (Approx. 27% of total feed)</h3>
                <p className="flex text-xs text-gray-500 mb-2">
                  <Info /> Contains Food with Concentrated Nutrients (27% max)
                </p>

                {/* Toggle for Concentrate Limits */}
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="toggle-concentrate-limits"
                    className="checkbox checkbox-success checkbox-xs rounded-md" 
                    checked={showConcentrateLimits}
                    onChange={(e) => setShowConcentrateLimits(e.target.checked)}
                  />
                  <label htmlFor="toggle-concentrate-limits" className="cursor-pointer text-[11px] font-medium text-gray-600 uppercase tracking-wider">
                    Add/Show Amount Limit
                  </label>
                </div>
              </div>

              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-sm">Name</th>
                      {showConcentrateLimits && (
                        <>
                          <th className="text-center text-sm">Min</th>
                          <th className="text-center text-sm">Max</th>
                        </>
                      )}
                      <th className="text-sm">Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{renderIngredientsTableRows('concentrate')}</tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-100">
                <button
                  disabled={isDisabled}
                  onClick={() => {
                    setIsChooseIngredientsModalOpen(true); 
                    setFilterIngredientCode('concentrate');
                  }}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add Concentrate
                </button>
              </div>
            </div>

            
          </div>

          {/* Vitamins Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="p-4">
                <h3 className="mb-2 text-sm font-semibold">Mineral Supplement (Approx. 3% of total feed)</h3>
                <p className="flex text-xs text-gray-500 mb-3">
                  <Info /> Contains Minerals.
                </p>

                {/* Toggle for Vitamin Limits */}
                <div className="flex items-center gap-2 mb-1">
                  <input 
                    type="checkbox" 
                    id="toggle-vitamin-limits"
                    className="checkbox checkbox-success checkbox-xs rounded-md" 
                    checked={showVitaminLimits}
                    onChange={(e) => setShowVitaminLimits(e.target.checked)}
                  />
                  <label htmlFor="toggle-vitamin-limits" className="cursor-pointer text-[11px] font-medium text-gray-600 uppercase tracking-wider">
                    Add/Show Amount Limit
                  </label>
                </div>
              </div>

              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr className="bg-gray-50 text-xs">
                      <th>Name</th>
                      {showVitaminLimits && (
                        <>
                          <th className="text-center">Min</th>
                          <th className="text-center">Max</th>
                        </>
                      )}
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{renderIngredientsTableRows('vitamins')}</tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-100">
                <button
                  disabled={isDisabled}
                  onClick={() => {
                    setIsChooseIngredientsModalOpen(true); 
                    setFilterIngredientCode('vitamins');
                  }}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add Vitamins Minerals
                </button>
              </div>
            </div>

            </>) : (<>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            
            <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${constraintMode === 'percent' ? 'md:col-span-1' : 'md:col-span-1'} `}>
  <div className="p-4">
    <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
      <h3 className="text-sm font-semibold">All Ingredients (kg)</h3>
      
      {/* Dynamic Constraint Mode Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Constraints:</label>
        <select 
          className="select select-bordered select-xs rounded-lg font-medium text-deepbrown"
          value={constraintMode} // 'none', 'kg', or 'percent'
          onChange={(e) => setConstraintMode(e.target.value)}
        >
          <option value="none">No Limits</option>
          <option value="kg">Fixed (kg)</option>
          <option value="percent">Manual Percentage (%)</option>
        </select>
      </div>
    </div>

    <p className="flex items-center gap-1 text-xs text-gray-500">
      <Info size={14} /> 
      <span>
        {constraintMode === 'percent' 
          ? 'Enter constraints as % of total formulation weight.' 
          : 'Shows all ingredients in the formulation in kilograms.'}
      </span>
    </p>
  </div>

  <div className="max-h-64 overflow-x-auto overflow-y-auto no-scrollbar">
    <table className="table-sm table-pin-rows table w-full">
      <thead>
        <tr>
          <th className="text-deepbrown">Name</th>
          {/* Conditional Headers based on mode */}
          {constraintMode !== 'none' && (
            <>
              <th className="text-deepbrown text-center">
                 {constraintMode === 'percent' ? '(%)' : 'Min (kg)'}
              </th>
              {constraintMode !== 'percent' && <th className="text-deepbrown text-center">
                Max {constraintMode === 'percent' ? '(%)' : '(kg)'}
              </th> }
              
            </>
          )}
          <th className="text-deepbrown">Classification</th>

          {constraintMode !== 'percent' && (
            <th className="text-deepbrown">Amount</th>
          )}
          
          <th></th>
        </tr>
      </thead>
      <tbody>
        {ingredients?.map((ingredient, index) => (
          <tr key={index} className="hover:bg-base-200/50 transition-colors">
            <td className="max-w-[120px] truncate md:max-w-none font-medium">
              {ingredient.name}
            </td>

            {/* Dynamic Inputs */}
            {constraintMode !== 'none' && (
              <>
                {/* Min Input */}
                <td>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      className="input input-bordered input-xs w-20 pr-6"
                      placeholder="N/A"
                      value={ingredient.minimum || ''}
                      onChange={(e) => handleIngredientMinimumChange(ingredient.ingredient_id, e.target.value)}
                    />
                    {constraintMode === 'percent' && (
                      <span className="absolute right-2 text-[10px] text-gray-400">%</span>
                    )}
                  </div>
                </td>
                {/* Max Input */}

                {constraintMode !== 'percent' &&
                <td>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      className="input input-bordered input-xs w-20 pr-6"
                      placeholder="N/A"
                      value={ingredient.maximum || ''}
                      onChange={(e) => handleIngredientMaximumChange(ingredient.ingredient_id, e.target.value)}
                    />
                    {constraintMode === 'percent' && (
                      <span className="absolute right-2 text-[10px] text-gray-400">%</span>
                    )}
                  </div>
                </td>
                
                }
                
              </>
            )}

            <td className="text-gray-500 text-xs uppercase">{ingredient.group}</td>

            {constraintMode !== 'percent' && (
            <td className="font-mono font-bold text-deepbrown">
              {ingredient.value.toFixed(3)}
            </td>
          )}
            

            <td className="text-right">
              <button
                disabled={isDisabled}
                className="btn btn-ghost btn-xs text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleRemoveIngredient(ingredient)}
              >
                <RiDeleteBinLine size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex flex-row space-x-5">
    <button
      disabled={isDisabled}
      onClick={() => setIsChooseIngredientsModalOpen(true)}
      className="bg-green-button flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white shadow-sm hover:bg-green-600 active:transform active:scale-95 transition-all disabled:bg-gray-300"
    >
      <RiAddLine /> Add ingredient
    </button>
    
    {constraintMode === 'percent' && (

      <button
      disabled={isDisabled}
      onClick={() => handleManualOptimize()}
      className="bg-yellow-400 flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-deepbrown shadow-sm hover:bg-green-600 active:transform active:scale-95 transition-all disabled:bg-gray-300"
    >
      <RiCalculatorLine /> Optimize
    </button>
    )}
    
  </div>
</div>

        {constraintMode === 'percent' && (
          <ManualFormulation
        isOpen ={isManualFormulationOpen}
        onClose={()=>setIsManualFormulationOpen(false)}
        results={optimizationResults}
        onGenerateReport={() => {
          setIsResultsModalOpen(false);
          setIsCustomizationModalOpen(true);
        }}
        formulation={formulationRealTime}
      />
         ) }
        
            {/* NUtrients section */}
          {constraintMode !== 'percent' &&(
            
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white sm:mt-0 mt-4 ">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Nutrients (g)</h3>
                    {/* Reference Button */}
                    <button 
                      onClick={() => setIsPCCModalOpen(true)}
                      className="btn btn-ghost btn-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                    >
                      <RiBookLine /> Reference: PCC Book
                    </button>
                  </div>
                </div>
                
                <p className="flex text-xs text-gray-500">
                  <Info className="mr-1" /> Shows all nutrients in the formulation in grams.
                </p>
              </div>

              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutrients && nutrients.map((nutrient, index) => (
                      <tr key={nutrient.nutrient_id || index} className="hover:bg-base-300">
                        <td className="font-medium">{nutrient.name}</td>
                        {/* Minimum Input */}
                        <td>
                          <div className="relative">
                            <input
                              id={`nutrient-${index}-minimum`}
                              type="text"
                              className="input input-bordered input-xs w-20"
                              disabled={isDisabled}
                              value={nutrient.minimum !== 0 ? nutrient.minimum : 'N/A'}
                              onChange={(e) => {
                                const inputValue = e.target.value
                                // in consideration for 'N/A' values which means 0
                                if (
                                  /^N\/A(\d+|\.)/.test(inputValue) ||
                                  /^\d*\.?\d{0,2}$/.test(inputValue)
                                ) {
                                  // to allow rewriting of input if user types a number after clicking on input with 'N/A'
                                  const processedValue = /^N\/A\d*/.test(inputValue)
                                    ? inputValue.replace('N/A', '')
                                    : inputValue
                                  handleNutrientMinimumChange(nutrient.nutrient_id, processedValue)
                                  setIsDirty(false)
                                }
                              }}
                              onFocus={() => updateMyPresence({ focusedId: `nutrient-${index}-minimum` })}
                              onBlur={() => updateMyPresence({ focusedId: null })}
                            />
                            <Selections id={`nutrient-${index}-minimum`} others={others} />
                          </div>
                        </td>
                        {/* Maximum Input */}
                        <td>
                          <div className="relative">
                            <input
                              id={`nutrient-${index}-maximum`}
                              type="text"
                              className="input input-bordered input-xs w-20"
                              disabled={isDisabled}
                              value={nutrient.maximum !== 0 ? nutrient.maximum : 'N/A'}
                              onChange={(e) => {
                const inputValue = e.target.value
                
                // in consideration for 'N/A' values which means 0
                if (
                  /^N\/A(\d+|\.)/.test(inputValue) ||
                  /^\d*\.?\d{0,2}$/.test(inputValue)
                ) {
                  // to allow rewriting of input if user types a number after clicking on input with 'N/A'
                  const processedValue = /^N\/A\d*/.test(inputValue)
                    ? inputValue.replace('N/A', '')
                    : inputValue
                  handleNutrientMaximumChange(nutrient.nutrient_id, processedValue)
                  setIsDirty(false)
                }
              }}
                              onFocus={() => updateMyPresence({ focusedId: `nutrient-${index}-maximum` })}
                              onBlur={() => updateMyPresence({ focusedId: null })}
                            />
                            <Selections id={`nutrient-${index}-maximum`} others={others} />
                          </div>
                        </td>
                        <td className="text-gray-600">{nutrient.value.toFixed(3)}</td>
                        <td>
                          {!isDisabled && (
                            <button
                              className="btn btn-ghost btn-xs text-red-500 hover:bg-red-200"
                              onClick={() => handleRemoveNutrient(nutrient)}
                            >
                              <RiDeleteBinLine />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    
                  </tbody>
                  
                </table>
                
              </div>

              {/* PCC Reference Modal / Section */}
              {isPCCModalOpen && (
                <div className="modal modal-open">
                  <div className="modal-box max-w-md">
                    <h3 className="font-bold text-lg mb-1">Formulation Information (PCC Book)</h3>
                    <h3 className="font-medium text-sm mb-4">Other changes may be due to carabao's special phases (ie. Mid-Lactation, Late Pregnancy)</h3>
                    <h3 className="font-medium text-xs mb-4">Minimum is 20% lower than actual value and maximum is 20% higher</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 border-b pb-2 text-xs font-bold uppercase text-gray-500">
                        <span>Nutrient</span>
                        <span className="text-right">Reference Avg (min+max/2)</span>
                      </div>
                      {formulation.origNutrientTargets.map((n) => {
                        const avg = (Number(n.minimum || 0) + Number(n.maximum || 0)) / 2;
                        return (
                          <div key={n.nutrient_id} className="grid grid-cols-2 py-1 text-sm border-b border-gray-50">
                            <span>{n.name}</span>
                            <span className="text-right font-mono">{avg.toFixed(2)}g</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="modal-action">
                      <button className="btn btn-sm" onClick={() => setIsPCCModalOpen(false)}>Close</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-4">
                <button
                  disabled={isDisabled}
                  onClick={() => setIsChooseNutrientsModalOpen(true)}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add nutrient
                </button>
              </div>
            </div>)}
            </div>

            {/* Nutrient Ratio Constraints Table */}

            {constraintMode!== 'percent' && (

            
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white mt-4">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Nutrient Ratio Constraints</h3>
                  <p className="flex text-xs text-gray-500">
                    <Info /> Set constraints between two nutrients (e.g., Protein : Fat ≥ 2:1).
                  </p>
                </div>
                <button
                  disabled={isDisabled}
                  onClick={() => {
                    setNutrientRatioModifyType('add');
                    setIsChooseNutrientRatiosModalOpen(true);
                  }}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add ratio
                </button>
              </div>
              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr>
                      <th>First Nutrient</th>
                      <th>Second Nutrient</th>
                      <th>Operator</th>
                      <th>Ratio</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{renderNutrientRatiosTableRows()}</tbody>
                </table>
              </div>
            </div>
            )}
            
            </>
            )}
          

          {constraintMode !== 'percent' ? (

            <div className="flex flex-wrap justify-end gap-2 px-4 pb-5 md:mb-0 mb-15 md:mt-0 mt-5">
            {/* Target Amount */}
            
            <div className="flex items-center justify-end gap-1 pr-2">
              <span className="text-sm font-medium text-gray-600">
                Amount to be Fed (kg):
              </span>
              <span className="text-green-button text-lg font-bold underline">
                <div>
                  <input
                    id="input-weight"
                    type="text"
                    className="input input-bordered w-[80px] rounded-xl"
                    disabled={isDisabled}
                    value={weight}
                    onFocus={(e) =>
                      updateMyPresence({ focusedId: e.target.id })
                    }
                    onBlur={() => updateMyPresence({ focusedId: null })}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        updateWeight(100)
                      } else {
                        updateWeight(e.target.value)
                      }
                    }}
                    maxLength={20}
                  />
                  <Selections id="input-weight" others={others} />
                </div>
              </span>
            </div>
            {/* Total Cost */}
            <div className="flex items-center justify-end gap-1 pr-2 ">
              <span className="text-sm font-medium text-gray-600">
                Total cost (per {weight} kg):
              </span>
              <span className="text-green-button text-lg font-bold underline">
                ₱ {cost && cost.toFixed(2)}
              </span>
            </div>
            
          </div>
            
          
          
          ): <div className='w-full mb-10 bg-white h-10'></div>}
          
        </div>
      </div>

      {/*  Modals */}
      <ShareFormulationModal
        isOpen={isShareFormulationModalOpen}
        onClose={() => setIsShareFormulationModalOpen(false)}
        onAdd={goToConfirmationModal}
        onEdit={handleUpdateCollaborator}
        onDelete={handleDeleteCollaborator}
        userId={user._id}
        formulation={formulation}
        collaborators={collaborators}
      />
      <ConfirmationModal
        isOpen={isAddCollaboratorModalOpen}
        onClose={() => setIsAddCollaboratorModalOpen(false)}
        onConfirm={handleAddCollaborator}
        title="Add collaborator"
        description={
          <>
            Add <strong>{newCollaborator.newEmail}</strong> as a collaborator to
            this formulation?
          </>
        }
        type="add"
      />

      <ShadowPricingTab
        open={shadowPricingTabOpen}
        onClose={()=>setShadowPricingTabOpen(false)}
        data={shadowPrices}
      />

      <ChooseIngredientsModal
        isOpen={isChooseIngredientsModalOpen}
        onClose={() => setIsChooseIngredientsModalOpen(false)}
        ingredients={ingredientsMenu}
        onResult={handleAddIngredients}
        ingredientsFilter={filterIngredientCode}
      />
      <ChooseNutrientsModal
        isOpen={isChooseNutrientsModalOpen}
        onClose={() => setIsChooseNutrientsModalOpen(false)}
        nutrients={nutrientsMenu}
        onResult={handleAddNutrients}
      />

      <ChooseNutrientRatiosModal
        isOpen={isChooseNutrientRatiosModalOpen}
        onClose={() => {
          setIsChooseNutrientRatiosModalOpen(false);
          setEditingNutrientRatioIndex(null);
          setNutrientRatioToEdit(null);
        }}
        nutrients={nutrients}
        allNutrients={listOfNutrients}
        onResult={(newRatio) => {
          // Add new nutrient ratio to the shared real-time data
          updateNutrientRatioConstraints([...(nutrientRatioConstraints || []), newRatio]);
        }}
        onUpdate={handleUpdateNutrientRatio} // for edit mode
        type={nutrientRatioModifyType}
        editingNutrientRatio={nutrientRatioToEdit}
      />

      <Progress
        open={progressPressed}
        onClose={() => setProgressPressed(false)}
        weightProgress={formulation.weightProgress}
        milkYieldProgress={formulation.milkYieldProgress}
        typeProgress={formulation.typeProgress}
        dateProgress={formulation.dateProgress}
      />

      {/*  Toasts */}
      <Toast
        className="transition delay-150 ease-in-out"
        show={showToast}
        action={toastAction}
        message={message}
        onHide={hideToast}
      />

      {!isCustomizationModalOpen && (advancedPressed&& constraintMode!=='percent') &&
      <OptimizeFAB
        handleOptimize = {handleOptimize}
      />
}

      

      
      
      
      <OptimizationResultsModal 
        isOpen={isResultsModalOpen}
        results={optimizationResults}
        onClose={() => setIsResultsModalOpen(false)}
        onGenerateReport={() => {
          setIsResultsModalOpen(false);
          setIsCustomizationModalOpen(true);
        }}
        formulation={formulationRealTime}
      />
      <UserCustomizationModal
        isOpen={isCustomizationModalOpen}
        onClose={() => setIsCustomizationModalOpen(false)}
        onGenerate={handleGenerateReport}
        userAccess={userAccess}
        formulation={formulationRealTime}
        owner={owner}
        weight={weight}
        shadowPrices={shadowPrices}
        isCustomizationModalOpen={isCustomizationModalOpen}
        setIsCustomizationModalOpen={setIsCustomizationModalOpen}
      />

      <EditFormulationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        formulation={formulation}
        onResult={handleEditResult}
      />
      
    </div>
  )
}

function Selections({ id, others }) {
  return (
    <>
      {others.map(({ connectionId, info, presence }) => {
        if (presence.focusedId === id) {
          return (
            <Selection
              key={connectionId}
              name={info.name}
              color={COLORS[connectionId % COLORS.length]}
            />
          )
        }
      })}
    </>
  )
}

export default ViewFormulation
