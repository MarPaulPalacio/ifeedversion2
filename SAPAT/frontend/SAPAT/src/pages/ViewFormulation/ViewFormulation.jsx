import {
  RiShareLine,
  RiAddLine,
  RiCalculatorLine,
  RiDeleteBinLine,
  RiSave2Line,
  RiPencilLine,
} from 'react-icons/ri'
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
import ShadowPricingTab from '../../components/modals/viewformulation/ShadowPricingTab.jsx'

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

  // chosen ingredients and nutrients
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [selectedNutrients, setSelectedNutrients] = useState([])

  // Shadow prices (for simplex optimization)
  const [shadowPricingTabOpen, setShadowPricingTabOpen ]= useState(false);

  // un-updated ingredient/nutrient values (when user enters new min/max that has not been optimized yet)
  const [isDirty, setIsDirty] = useState(false)


  const [filterIngredientCode, setFilterIngredientCode] = useState('')

  // Used for showing ingredients and the type of ingredient e.g. roughage, vitamins or concentrate
  const [groupFilter, setGroupFilter] = useState([])
  const isDisabled = userAccess === 'view'

  useEffect(() => {
    if (formulation) {
      setSelectedIngredients(formulation.ingredients || [])
      setSelectedNutrients(formulation.nutrients || [])
    }
  }, [formulation])

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

  // const fetchOwner = async () => {
  //   try {
  //     const res = await axios.get(
  //       `${import.meta.env.VITE_API_URL}/formulation/owner/${id}`
  //     )
  //     setOwner(res.data.owner)
  //   } catch (err) {
  //     console.log(err)
  //   }
  // }

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

  const handleOptimize = async (
    ingredients,
    nutrients,
    weight,
    type
  ) => {
    try {
      // UNCOMMENT/DELETE IF NOT NEEDED
      console.log("DEBUG HERE: FRONTEND SENING OF DATA TO SOLVER!")
      console.log("Ingredients", ingredients)
      console.log("Nutrients", nutrients)
      console.log("Weight", weight)
      console.log("Nutrient Ratios", nutrientRatioConstraints)

      const res = await axios.post(`${VITE_API_URL}/optimize/${type}`, {
        userId: owner?.userId,
        ingredients,
        nutrients,
        weight,
        nutrientRatioConstraints 
      })
      console.log(res.data) // View Optimization results
      const optimizedCost = res.data.optimizedCost
      const optimizedIngredients = res.data.optimizedIngredients
      const optimizedNutrients = res.data.optimizedNutrients
      const shadowPricesResult = res.data.shadowPrices

      console.log("OPTIMIZATION RESULT:", optimizedIngredients, optimizedNutrients)

      
      // Update shadow prices in real-time storage
      updateShadowPrices(shadowPricesResult || []);

      updateCost(optimizedCost)
      optimizedIngredients.map((ing, index) => {  
        const ingredientId = ingredients.find(i => i.name === ing.name)?.ingredient_id;
        updateIngredientProperty(ingredientId, 'value', Number(ing.value))
      })
      optimizedNutrients.map((nut, index) => {
        const nutrientId = nutrients.find(n => n.name === nut.name)?.nutrient_id;
        updateNutrientProperty(nutrientId, 'value', Number(nut.value))
      })
      setIsDirty(false)
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
          console.log("ALL")
        }
        
      )
      console.log("FILTERED INGREDIENTS:", filtered, group)
    if (filtered.length > 0) {

      return filtered.map((ingredient, index) => (
        <tr key={index} className="hover:bg-base-300">
          <td>{ingredient.name}</td>
          <td>
            <input
              id={`ingredient-${index}-minimum`}
              type="text"
              className="input input-bordered input-xs w-15"
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
              onFocus={() => {
                updateMyPresence({ focusedId: `ingredient-${index}-minimum` })
              }}
              onBlur={() => updateMyPresence({ focusedId: null })}
            />
            <Selections id={`ingredient-${index}-minimum`} others={others} />
          </td>
          <td>
            <input
              id={`ingredient-${index}-maximum`}
              type="text"
              className="input input-bordered input-xs w-15"
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
                  let processedValue = /^N\/A\d*/.test(inputValue)
                    ? inputValue.replace('N/A', '')
                    : inputValue
                  // limit max constraint of ingredient to weight
                  const numericValue = parseFloat(processedValue)
                  if (!isNaN(numericValue) && numericValue > weight) {
                    processedValue = weight
                  }
                  handleIngredientMaximumChange(ingredient.ingredient_id, processedValue)
                  setIsDirty(false)
                }
              }}
              onFocus={() =>
                updateMyPresence({ focusedId: `ingredient-${index}-maximum` })
              }
              onBlur={() => updateMyPresence({ focusedId: null })}
            />
            <Selections id={`ingredient-${index}-maximum`} others={others} />
          </td>
          <td>{ingredient && weight && (ingredient.value * weight).toFixed(3)}</td>
          <td>
            <button
              disabled={isDisabled}
              className={`${isDisabled ? 'hidden' : ''} btn btn-ghost btn-xs text-red-500 hover:bg-red-200`}
              onClick={() => handleRemoveIngredient(ingredient)}
            >
              <RiDeleteBinLine />
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
        <tr key={index} className="hover:bg-base-300">
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


  function showNutrientsMissingBasedonIngredientsPresent (){
    // This function checks for nutrients that are missing (not met) based on the selected ingredients.
    // Make an axios call to /ingredient/filtered/:userId to fetch the latest ingredients for the owner
    // Returns a promise that resolves to the list of ingredients
    if (selectedIngredients.length === 0) {
      setMissingNutrientsValue((formulation.nutrients || []).map(n => n.name));
      return;
    }
    axios.get(`${import.meta.env.VITE_API_URL}/ingredient/filtered/${owner.userId}`)
    
    .then(res => res.data.ingredients)
      .then(res => {
        const ingredientswithnutri = res.filter(ingredient =>
          selectedIngredients.some(sample => sample.name === ingredient.name)
        );
        // You can now use ingredientswithnutri as needed
        console.log("IngredientswithNutri", ingredientswithnutri);
        console.log("Formulation Nutrients to Check Against:", formulation.nutrients);
        console.log("Selected Ingredients:", selectedIngredients);
        if (!ingredients || ingredients.length === 0) {
            return [<li key="no-nutrients">No nutrients to check.</li>];
        }
        // Get all unique nutrient names from ingredientswithnutri

        const allNutrientInFormulationId = (formulation.nutrients || []).reduce((acc, nutrient) => {
          acc[nutrient.nutrient_id] = 0;
          return acc;
        }, {});
        
        (formulation.nutrients || []).forEach(formulationnutrient => {
        
          (ingredientswithnutri || []).forEach(ingredient => {
            (ingredient.nutrients || []).forEach(nutrient => {
              
              if (nutrient.nutrient === formulationnutrient.nutrient_id) {
                allNutrientInFormulationId[nutrient.nutrient] += (nutrient.value || 0);
                console.log(`Adding ${nutrient.value} to nutrient ID ${nutrient.nutrient}`);
                console.log("Name of nutrient:", nutrient)
                console.log("NName of nutrient2:", ingredient)
              }
            });
          });
        });

        const missingNutrients = Object.entries(allNutrientInFormulationId)
          .filter(([_, value]) => value === 0)
          .map(([nutrientId]) => {
            // Find the nutrient object in formulation.nutrients by nutrient_id
            const nutrientObj = (formulation.nutrients || []).find(n => n.nutrient_id === nutrientId);
            return nutrientObj ? nutrientObj.name : `Nutrient ID: ${nutrientId}`;
          });
        console.log("Missing Nutrients:", missingNutrients);
        console.log("All Nutrients:", allNutrientInFormulationId);
        
        setMissingNutrientsValue(missingNutrients);
      })
    .catch(err => {
      console.error("Error fetching ingredients:", err);
      
    });
    
  }

  const {
    weight,
    code,
    name,
    description,
    animal_group,
    cost,
    ingredients,
    nutrients,
  } = formulationRealTime


  
  return (
    <div className="flex h-full flex-col bg-gray-50 md:flex-row">
      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          {/* Header */}
          <h1 className="text-deepbrown mb-5 text-xl font-bold md:text-2xl">
            View Formulation
          </h1>
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Optimize */}

              
              <div className={`${isDisabled ? '' : 'dropdown dropdown-hover'}`}>
                <div
                  tabIndex={isDisabled ? -1 : 0}
                  role="button"
                  className={`btn btn-primary btn-sm gap-2 rounded-lg shadow-md transition-all duration-300 ${
                    isDisabled
                      ? 'btn-disabled cursor-not-allowed opacity-50'
                      : 'hover:shadow-lg'
                  }`}
                >
                  <RiCalculatorLine className="text-lg" /> Optimize
                </div>
                {!isDisabled && (
                  <ul
                    tabIndex={0}
                    className="dropdown-content menu bg-base-200 rounded-box shadow-primary z-10 w-56 p-3 shadow-sm"
                  >
                    <li>
                      <button
                        className="hover:bg-primary hover:text-primary-content flex items-center rounded-lg py-2 transition-colors duration-200"
                        
                        onClick={() => {
                          
                          const nutrients = formulation.nutrients || [];
                          console.log("Nutrients being sent to optimization:", formulationRealTime);
                          handleOptimize(
                            // listOfIngredients || [],
                            ingredients || [],
                            nutrients || [],
                            weight,
                            'simplex'
                          )
                        }}
                      >
                        Simplex
                      </button>
                    </li>
                    <li>
                      <button
                        className="hover:bg-primary hover:text-primary-content flex items-center rounded-lg py-2 transition-colors duration-200"
                        onClick={() => {

                          handleOptimize(
                            // listOfIngredients || [],
                            ingredients || [],
                            nutrients || [],
                            weight,
                            'pso'
                          )
                        }}
                      >
                        Particle Swarm Optimization
                      </button>
                    </li>
                  </ul>
                )}
              </div>
              {/* Generate Report */}
              <GenerateReport
                userAccess={userAccess}
                formulation={formulationRealTime}
                owner={owner}
                weight={weight}
                shadowPrices={shadowPrices}
              />
              <div className='flex items-center justify-end gap-1 pr-2'>
              
              <button
                className="btn border border-gray-400 btn-sm gap-2 rounded-lg text-xs"
                onClick={() => setShadowPricingTabOpen(true)}
                disabled={isDisabled}
              >
                See Shadow Prices
              </button>
              <ShadowPricingTab
                isOpen={shadowPricingTabOpen}
                onClose={() => setShadowPricingTabOpen(false)}
                // formulation={formulationRealTime}
                data={shadowPrices}
              />
              </div>

              <div className='flex items-center justify-end gap-1 pr-2'>
              
              <button
                className={`btn border border-gray-400 btn-sm gap-2 rounded-lg text-xs ${advancedPressed ? 'bg-green-button text-white' : 'bg-white text-black'}`}
                onClick={() => setAdvancedPressed(!advancedPressed)}
                disabled={isDisabled}
              >
                {advancedPressed===false ? 'Show Basic' : 'Show Advanced'}
              </button>
              </div>
            </div>
            {/*<div className="flex flex-wrap gap-2">*/}
            {/*  <button*/}
            {/*    disabled={isDisabled}*/}
            {/*    className="border-deepbrown text-deepbrown hover:bg-deepbrown active:bg-deepbrown/80 flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors hover:text-white disabled:hidden"*/}
            {/*  >*/}
            {/*    <RiFileUploadLine className="h-4 w-4 md:h-5 md:w-5" />*/}
            {/*    <span>Import</span>*/}
            {/*  </button>*/}
            {/*  <button className="border-deepbrown text-deepbrown hover:bg-deepbrown active:bg-deepbrown/80 flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors hover:text-white">*/}
            {/*    <RiFileDownloadLine className="h-4 w-4 md:h-5 md:w-5" />*/}
            {/*    <span>Export</span>*/}
            {/*  </button>*/}
            {/*</div>*/}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {others.map(({ connectionId, info }) => (
                  <Avatar
                    key={connectionId}
                    src={info.avatar}
                    name={info.name}
                  />
                ))}
                <Avatar src={self.info.avatar} name="You" />
              </div>
              <div
                className={`${userAccess !== 'owner' && 'tooltip md:tooltip-left'}`}
                data-tip={`${userAccess !== 'owner' && 'Only the owner can share this formulation.'}`}
              >
                <button
                  disabled={userAccess !== 'owner'}
                  onClick={handleOpenShareFormulationModal}
                  className="btn btn-sm gap-1 rounded-lg text-xs"
                >
                  <RiShareLine /> Share ▼
                </button>
              </div>
              <div>
                <button
                  className="btn bg-green-button btn-sm gap-1 rounded-lg text-xs text-white transition-colors hover:bg-green-600 active:bg-green-700"
                  onClick={() => handleSave(isDirty)}
                  disabled={isDisabled}
                >
                  <RiSave2Line className="h-4 w-4" /> Save
                </button>
              </div>
            </div>
          </div>

          {/* Shown when values are not up-to-date */}
          {isDirty && (
            <div className="alert alert-error alert-soft text-sm">
              <Warning />
              <span>
                Formula constraints have changed. Click &quot;Optimize&quot; to
                update values and then save your changes.
              </span>
            </div>
          )}

          {/* Form Fields - Grid on desktop, Stack on mobile */}
          <div className={`grid grid-cols-1 gap-4 md:grid-cols-5`}>
            <div>
              <label className="label text-sm font-medium">Code</label>
              <input
                id="input-code"
                type="text"
                className="input input-bordered w-full rounded-xl"
                disabled={isDisabled}
                value={code}
                onFocus={(e) => updateMyPresence({ focusedId: e.target.id })}
                onBlur={() => updateMyPresence({ focusedId: null })}
                onChange={(e) => updateCode(e.target.value)}
                maxLength={20}
              />
              <Selections id="input-code" others={others} />
            </div>
            <div>
              <label className="label text-sm font-medium">
                Formulation name
              </label>
              <input
                id="input-name"
                type="text"
                className="input input-bordered w-full rounded-xl"
                disabled={isDisabled}
                value={name}
                onFocus={(e) => updateMyPresence({ focusedId: e.target.id })}
                onBlur={() => updateMyPresence({ focusedId: null })}
                onChange={(e) => updateName(e.target.value)}
                maxLength={20}
              />
              <Selections id="input-name" others={others} />
            </div>
            <div className="md:col-span-2">
              <label className="label text-sm font-medium">Description</label>
              <input
                id="input-description"
                type="text"
                className="input input-bordered w-full rounded-xl"
                disabled={isDisabled}
                value={description}
                onFocus={(e) => updateMyPresence({ focusedId: e.target.id })}
                onBlur={() => updateMyPresence({ focusedId: null })}
                onChange={(e) => updateDescription(e.target.value)}
              />
              <Selections id="input-description" others={others} />
            </div>
            <div>
              <label className="label text-sm font-medium">Animal group</label>
              <select
                id="input-animal_group"
                className="select select-bordered w-full rounded-xl"
                disabled={isDisabled}
                name="input-animal_group"
                value={animal_group}
                onFocus={(e) => updateMyPresence({ focusedId: e.target.id })}
                onBlur={() => updateMyPresence({ focusedId: null })}
                onChange={(e) => updateAnimalGroup(e.target.value)}
              >
                <option value="Swine">Swine</option>
                <option value="Pig">Pig</option>
                <option value="Poultry">Poultry</option>
                <option value="Water Buffalo">Water Buffalo</option>
              </select>
              <Selections id="input-animal_group" others={others} />
            </div>


            
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
          { advancedPressed ? (<>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Roughage Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="p-4">
                <h3 className="mb-2 text-sm font-semibold">Roughage (Approx. 70% of total feed)</h3>
                <p className="flex text-xs text-gray-500">
                  <Info /> Contains Grasses, Legumes, and other by-products.
                </p>
              </div>
              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{renderIngredientsTableRows('roughage')}</tbody>
                </table>
              </div>
              <div className="p-4">
                <button
                  disabled={isDisabled}
                  onClick={() => {setIsChooseIngredientsModalOpen(true); setFilterIngredientCode('roughage')}}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add ingredient
                </button>
              </div>
            </div>

            {/* Concentrate Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="p-4">
                <h3 className="mb-2 text-sm font-semibold">Concentrate (Approx. 27% of total feed)</h3>
                <p className="flex text-xs text-gray-500">
                  <Info /> Contains Vitamins and Minerals (3% max), and other supplements rich in a specific nutrient.
                </p>
              </div>
              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{renderIngredientsTableRows('concentrate')}</tbody>
                </table>
              </div>
              <div className="p-4">
                <button
                  disabled={isDisabled}
                  onClick={() => {setIsChooseIngredientsModalOpen(true); setFilterIngredientCode('concentrate')}}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add ingredient
                </button>
              </div>
            </div>

            
          </div>

          {/* Vitamins Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="p-4">
                <h3 className="mb-2 text-sm font-semibold">Vitamins (Approx. 3% of total feed)</h3>
                <p className="flex text-xs text-gray-500">
                  <Info /> Contains Purely Vitamins and Minerals.
                </p>
              </div>
              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{renderIngredientsTableRows('vitamins')}</tbody>
                </table>
              </div>
              <div className="p-4">
                <button
                  disabled={isDisabled}
                  onClick={() => {setIsChooseIngredientsModalOpen(true); setFilterIngredientCode('vitamins')}}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add ingredient
                </button>
              </div>
            </div>

            </>) : (<>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="p-4">
                <h3 className="mb-2 text-sm font-semibold">All Ingredients</h3>
                <p className="flex text-xs text-gray-500">
                  <Info /> Shows all ingredients in the formulation.
                </p>
              </div>
              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients &&
                      ingredients.map((ingredient, index) => (
                        <tr key={index} className="hover:bg-base-300">
                          <td>{ingredient.name}</td>
                          <td>
                            <input
                              id={`ingredient-${index}-minimum`}
                              type="text"
                              className="input input-bordered input-xs w-15"
                              disabled={isDisabled}
                              value={ingredient.minimum !== 0 ? ingredient.minimum : 'N/A'}
                              onChange={(e) => {
                                const inputValue = e.target.value
                                if (
                                  /^N\/A(\d+|\.)/.test(inputValue) ||
                                  /^\d*\.?\d{0,2}$/.test(inputValue)
                                ) {
                                  const processedValue = /^N\/A\d*/.test(inputValue)
                                    ? inputValue.replace('N/A', '')
                                    : inputValue
                                  handleIngredientMinimumChange(ingredient.ingredient_id, processedValue)
                                  setIsDirty(false)
                                }
                              }}
                              onFocus={() => {
                                updateMyPresence({ focusedId: `ingredient-${index}-minimum` })
                              }}
                              onBlur={() => updateMyPresence({ focusedId: null })}
                            />
                            <Selections id={`ingredient-${index}-minimum`} others={others} />
                          </td>
                          <td>
                            <input
                              id={`ingredient-${index}-maximum`}
                              type="text"
                              className="input input-bordered input-xs w-15"
                              disabled={isDisabled}
                              value={ingredient.maximum !== 0 ? ingredient.maximum : 'N/A'}
                              onChange={(e) => {
                                const inputValue = e.target.value
                                if (
                                  /^N\/A(\d+|\.)/.test(inputValue) ||
                                  /^\d*\.?\d{0,2}$/.test(inputValue)
                                ) {
                                  let processedValue = /^N\/A\d*/.test(inputValue)
                                    ? inputValue.replace('N/A', '')
                                    : inputValue
                                  const numericValue = parseFloat(processedValue)
                                  if (!isNaN(numericValue) && numericValue > weight) {
                                    processedValue = weight
                                  }
                                  handleIngredientMaximumChange(ingredient.ingredient_id, processedValue)
                                  setIsDirty(false)
                                }
                              }}
                              onFocus={() =>
                                updateMyPresence({ focusedId: `ingredient-${index}-maximum` })
                              }
                              onBlur={() => updateMyPresence({ focusedId: null })}
                            />
                            <Selections id={`ingredient-${index}-maximum`} others={others} />
                          </td>
                          <td>
                            {ingredient && weight && (ingredient.value * weight).toFixed(3)}
                          </td>
                          <td>
                            <button
                              disabled={isDisabled}
                              className={`${isDisabled ? 'hidden' : ''} btn btn-ghost btn-xs text-red-500 hover:bg-red-200`}
                              onClick={() => handleRemoveIngredient(ingredient)}
                            >
                              <RiDeleteBinLine />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4">
                <button
                  disabled={isDisabled}
                  onClick={() => { setIsChooseIngredientsModalOpen(true); setFilterIngredientCode('') }}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add ingredient
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white sm:mt-0 mt-4 ">
              <div className="p-4">
                <h3 className="mb-2 text-sm font-semibold">Nutrients</h3>
                <p className="flex text-xs text-gray-500">
                  <Info /> Shows all nutrients in the formulation.
                </p>
              </div>
              <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{renderNutrientsTableRows()}</tbody>
                </table>
              </div>
              <div className="p-4">
                <button
                  disabled={isDisabled}
                  onClick={() => setIsChooseNutrientsModalOpen(true)}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add nutrient
                </button>
              </div>
            </div>
            </div>

            {/* Nutrient Ratio Constraints Table */}
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
            
            </>
            )}
          
          <div className="flex flex-wrap justify-end gap-2 px-4 pb-5">
            {/* Target Amount */}
            
            <div className="flex items-center justify-end gap-1 pr-2">
              <span className="text-sm font-medium text-gray-600">
                Target amount (kg):
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
            <div className="flex items-center justify-end gap-1 pr-2">
              <span className="text-sm font-medium text-gray-600">
                Total cost (per {weight} kg):
              </span>
              <span className="text-green-button text-lg font-bold underline">
                ₱ {cost && cost.toFixed(2)}
              </span>
            </div>
            
          </div>
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

      {/*  Toasts */}
      <Toast
        className="transition delay-150 ease-in-out"
        show={showToast}
        action={toastAction}
        message={message}
        onHide={hideToast}
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
