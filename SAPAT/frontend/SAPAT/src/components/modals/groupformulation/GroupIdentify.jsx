import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Info from '../../icons/Info.jsx'
import Selection from '../../Selection.jsx'
import { RiAddLine, RiDeleteBinLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'
import ChooseIngredientsModal from '../viewformulation/ChooseIngredientsModal'
import Toast from '../../Toast.jsx'
function GroupIdentify({
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
  identifyCurrentCarabaoPhase,
  updateDatabase
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
  const [showIngredientsTable, setShowIngredientsTable] = useState(false)
  const [showNutrientsTable, setShowNutrientsTable] = useState(false)
  const [submitType, setSubmitType] = useState('modify')
  useEffect(() => {
    // update formData (get name and unit for each nutrient)
    fetchNutrientData()
    fetchIngredients()
  }, [])

  const fetchNutrientData = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/nutrient/filtered/${ownerId}`
      )
      const fetchedData = res.data.nutrients
      const formattedNutrients = fetchedData.map((nutrient) => {
        return {
          nutrient: nutrient._id,
          name: nutrient.name,
          unit: nutrient.unit,
          min_value: 0,
          max_value: 0,
        }
      })
      setFormData((prevFormData) => {
        return {
          ...prevFormData,
          nutrients: formattedNutrients,
        }
      })

      
      setLocalNutrients(formattedNutrients)
    } catch (err) {
      console.log(err)
    }
  }

  const fetchIngredients = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/ingredient/filtered/${ownerId?.userId}?limit=10000`
      );
      const fetchedData = res.data.ingredients;
      
      // Set the master list first
      setListOfIngredients(fetchedData);
      
      // Then organize the menu
      console.log(fetchedData, "FETRCHED DAATA")
      // organizeIngredients(fetchedData); 
      setIngredientsMenu(fetchedData);
    } catch (err) {
      console.log("Error fetching:", err);
    }
  }

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
      .finally(() => setIsLoadingTemplates(false), console.log("FETCED TEMPLATES" , formulations)

    );
  }, [isOpen]);

  // Reset template selection when animal group changes
  useEffect(() => {
    setSelectedTemplate({ id: 0, name: 'None' })
    setTemplateQuery('')
  }, [formData.animal_group])



  const [ingredients, setIngredients] = useState([])
  const [listOfIngredients, setListOfIngredients] = useState([])
  const [ingredientsMenu, setIngredientsMenu] = useState([])
  const [filterIngredientCode, setFilterIngredientCode] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [showToast, setShowToast] = useState(false)
  const [message, setMessage] = useState('')
  const [toastAction, setToastAction] = useState('')
  const hideToast = () => {
    setShowToast(false)
    setMessage('')
    setToastAction('')
  }


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
    console.log(formulations)
    const matchingFormulations = formulations.filter((f) => {
      if (f.animal_group !== formData.animal_group) return false
      
      const [min, max] = formData.body_weight.split('-').map(Number)
      const formWeight = Number(f.weight)
      
      return formWeight >= min && formWeight <= max
    })

    console.log(matchingFormulations)
    console.log("FormData", formData)

    if (matchingFormulations.length > 0) {
      console.log("Matching formulations found:", matchingFormulations)
      console.log("Formulation nutrients before mapping constraints:", showNutrientsTable)
      const updatedFormulations = matchingFormulations.map((formulation) => ({
      ...formulation,
      nutrients: showNutrientsTable === true ? (formulation.nutrients.map((currnutrient) => {
        const formDataNutrient = formData.nutrients?.find(
        (n) => n.nutrient === currnutrient.nutrient_id,
        )
        console.log("Current nutrient: SHOWSN")

        return formDataNutrient
        ? {
          ...currnutrient,
          minimum: formDataNutrient.min_value,
          maximum: formDataNutrient.max_value,
          }
        : currnutrient
      })) : formulation.nutrients,

      ingredients: showIngredientsTable === true ?  [
        
        ...formulation.ingredients.map((currIngredient) => {
        const formDataIngredient = (formData.ingredients || []).find(
          (i) => i.ingredient_id === currIngredient.ingredient_id,
        )

        return formDataIngredient
          ? {
              ...currIngredient,
              minimum: formDataIngredient.minimum,
              maximum: formDataIngredient.maximum,
            }
          : currIngredient
      }),
      ...(formData.ingredients || []).filter(
        (newIng) => !formulation.ingredients.some(
          (curr) => curr.ingredient_id === newIng.ingredient_id
        )
      )
      ] : formulation.ingredients
      }
      
    ))

      console.log("Updated Formulations:", updatedFormulations)
      const combinedData = [
        ...(showNutrientsTable ? formData.nutrients || [] : []),
        ...(showIngredientsTable ? formData.ingredients || [] : [])
      ];
      console.log(combinedData, "COMBINED DATA")

      if (combinedData.length > 0) {
        for (const formulation of updatedFormulations) {
          await updateDatabase(formulation, combinedData, submitType)
        }
      }
    }
    
    setIsDisabled(false)
    handleClose()
    
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    console.log("HANDLE CHANGE TRIGGERED", name, value)
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
  const handleNutrientChange = (index, event) => {
    const { name, value } = event.target
    const updatedNutrients = formData.nutrients.map((nutrient, i) =>
      i === index ? { ...nutrient, [name]: value } : nutrient
    )
    setFormData((prev) => ({ ...prev, nutrients: updatedNutrients }))
  }

  const handleIngredientChange = (index, event) => {
    const { name, value } = event.target
    const updatedIngredients = formData.ingredients.map((ingredient, i) =>
      i === index ? { ...ingredient, [name]: value } : ingredient
    )
    setFormData((prev) => ({ ...prev, ingredients: updatedIngredients }))
  }

  const handleIngredientMinimumChange = (index, value) => {
    const ingredient = formData.ingredients.find(
      (ing) => ing.ingredient_id === index
    );
    if (ingredient) {
      const updatedIngredients = formData.ingredients.map((ing) =>
        ing.ingredient_id === index
          ? {
              ...ing,
              minimum:
                value === 'N/A' || value === '' ? 0 : value,
            }
          : ing
      );
      setFormData((prev) => ({
        ...prev,
        ingredients: updatedIngredients,
      }));
    }
  }

  const handleIngredientMaximumChange = (index, value) => {
    const ingredient = formData.ingredients.find(
      (ing) => ing.ingredient_id === index
    );
    if (ingredient) {
      const updatedIngredients = formData.ingredients.map((ing) =>
      ing.ingredient_id === index
        ? {
          ...ing,
          maximum:
          value === 'N/A' || value === '' ? 0 : value,
        }
        : ing
      );
      setFormData((prev) => ({
      ...prev,
      ingredients: updatedIngredients,
      }));
    }
  }
  const handleClose = () => {

    onClose()
  }

  const handleCarabaoCategoryPhase = ()=>{
    if (carabaoConfiguration.carabaoPhases!={} && identifyCurrentCarabaoPhase()!=null){
      return identifyCurrentCarabaoPhase()[1]
    } else {
      return formData.animal_group
    }
    
  }
  const [isChooseIngredientsModalOpen, setIsChooseIngredientsModalOpen] =
    useState(false)


  

  const handleAddIngredients = async (ingredientsToAdd) => {
    try {

        const formattedNew = ingredientsToAdd.map((ing) => ({
          ingredient_id: ing._id || ing.ingredient_id,
          name: ing.name,
          minimum: 0,
          maximum: 0,
          group: ing.group || ''
        }));
        setFormData(prev => ({
          ...prev,
          ingredients: [...(prev.ingredients || []), ...formattedNew]
        }));

      setIngredientsMenu(prev => prev.filter(item => !ingredientsToAdd.some(ing => ing._id === item._id || ing.ingredient_id === item._id)));
      setIsChooseIngredientsModalOpen(false);
      setShowToast(true);
      setMessage('Ingredients added successfully');
      setToastAction('success');
    } catch (err) {
      console.log(err)
      // toast instructions
      setShowToast(true)
      setMessage('Error adding ingredients')
      setToastAction('error')
    }
  }

    const handleRemoveIngredient = async (ingredientToRemove) => {
    try {
    
      setFormData(prev => ({
        ...prev,
        ingredients: prev.ingredients.filter(
          (item) => item.ingredient_id !== ingredientToRemove.ingredient_id
        )
      }));

      const ingredientToRemoveComplete = listOfIngredients.find(
        (item) => item._id === ingredientToRemove.ingredient_id
      );
      if (ingredientToRemoveComplete) {
        setIngredientsMenu(prev => [...prev, ingredientToRemoveComplete]);
      }
      // toast instructions
      setShowToast(true)
      setMessage('Ingredient removed successfully')
      setToastAction('success')
    } catch (err) {
      console.log(err)
      // toast instructions
      setShowToast(true)
      setMessage('Error removing ingredients')
      setToastAction('error')
    }
  }

  return (
    <>
      <>
        {/* Close button */}


        <form onSubmit={handleSubmit}>
         
          {/* Form fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            
            {/* Animal Group Select */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Carabao Category</span>
              </label>
              <select
                name="animal_group"
                value={handleCarabaoCategoryPhase()}
                disabled={isDisabled}
                onChange={handleChange}
                className="select select-bordered w-full rounded-xl"
              >
                <option value="" disabled>
                  Choose Carabao Phase
                </option>
                <option value="Heifer | Dumalaga">Heifer | Dumalaga</option>
                <option value="Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)">Calf (0-4 months) - lower than 100kg | Bulo (0 - 4 na buwan)</option>
                <option value="Growing Calves (5-12 months) | Lumalaking bula (5 - 12 buwan)">Growing Calves (5-12 months) | Lumalaking bula (5 - 12 buwan)</option>
                <option value="Junior Bull | Lumalaking bulugan (2 - 3 taon)">Junior Bull | Lumalaking bulugan (2 - 3 taon)</option>
                <option value="Cow | Inahing kalabaw">Cow | Inahing kalabaw</option>
                <option value="Senior Bull | Bulugan (> 3 taon)">Senior Bull | Bulugan ({'>'} 3 taon)</option>
              </select>
            </div>

            {/* Body Weight */}
            <div className='form-control w-full'>
              <label className="label">
              <span className="label-text">Body Weight</span>
              </label>

              {/* Generate weight options: 50 increments up to 200, then 100 increments up to 1000 */}
              <select
                name="body_weight"
                value={formData.body_weight ?? ''}
                required
                disabled={isDisabled}
                onChange={handleChange}
                    
                className={`select select-bordered w-full rounded-xl ${bodyWeightError ? 'border-red-500' : ''}`}
                >
                <option value="" disabled>
                  Choose body weight range (kg)
                </option>
                {(() => {
                  const ranges = []
                  // then 200-300, 300-400, ... up to 900-1000
                  let upper = 100
                  let lower = 0
                  while (upper <= 1000) {
                  ranges.push({ value: `${lower}-${upper}`, label: `${lower}-${upper} kg` })
                  lower = upper
                  upper += 100
                  }
                  return ranges.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                  ))
                })()}
              </select>

            {bodyWeightError && (
              <p className="mt-1 text-sm text-red-500" role="alert">
                {bodyWeightError}
              </p>
            )}
                  
            </div>

  

            {/* Ingredients table */}
            
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white col-span-2">
              <div className="p-4">

                <h3 className="mb-2 text-sm font-semibold">
                  <div className="mb-2 flex flex-row space-x-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showIngredientsTable ?? false}
                        onChange={() => setShowIngredientsTable(prev => !prev)}
                        className="checkbox"
                        disabled={isDisabled}
                      />
                      All Ingredients
                    </label>
                  </div>
                </h3>
                <p className="flex text-xs text-gray-500">
                  
                  <Info /> Shows all ingredients in the formulation.
                </p>
              </div>
              {showIngredientsTable && (
                <>
                <div className="max-h-64 overflow-x-auto overflow-y-auto">
                <table className="table-sm table-pin-rows table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Min</th>
                      <th>Max</th>
                      {/* <th>Value</th> */}
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    { formData.ingredients &&
                      formData.ingredients.map((ingredient, index) => (
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
                                  
                                }
                              }}
                              
                            />
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
                                  // if (!isNaN(numericValue) && numericValue > weight) {
                                  //   processedValue = weight
                                  // }
                                  handleIngredientMaximumChange(ingredient.ingredient_id, processedValue)
                                
                                }
                              }}
                              
                            />
                          </td>

                          {/* Calculated Value */}
                          {/* <td>
                            {ingredient && weight && (ingredient.value).toFixed(3)}
                          </td> */}
                          <td>
                            <button
                              type ="button"
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
                  type="button"
                  disabled={isDisabled}
                  onClick={() => { setIsChooseIngredientsModalOpen(true); setFilterIngredientCode('') }}
                  className="bg-green-button flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <RiAddLine /> Add ingredient
                </button>
              </div>
                
              </>
              
              )}
              
              
            </div>
            
            {/* Nutrients table */}

            <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 col-span-2">
              <div className="p-4">
                <h3 className="mb-2 text-sm font-semibold">
                  <div className="mb-2 flex flex-row space-x-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showNutrientsTable ?? false}
                        onChange={() => setShowNutrientsTable(prev => !prev)}
                        className="checkbox"
                        disabled={isDisabled}
                      />
                      All Nutrients
                    </label>
                  </div>
                </h3>
                <p className="flex text-xs text-gray-500">
                  <Info /> Shows all nutrients in the formulation.
                </p>
              </div>
              {showNutrientsTable && (
                <>
                <table className="table-zebra table-pin-rows table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="font-semibold">Name</th>
                    <th className="font-semibold">Unit</th>
                    <th className="font-semibold">Min Value</th>
                    <th className="font-semibold">Max Value</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.nutrients.map((nutrient, index) => (
                    <tr key={index}>
                      <td>{nutrient.name}</td>
                      <td>{nutrient.unit}</td>
                      <td>
                        <input
                          type="number"
                          name="min_value"
                          placeholder="Min Value"
                          className="input input-bordered input-sm w-full max-w-xs rounded-xl"
                          value={nutrient.min_value}
                          pattern="[0-9]*"
                          disabled={isDisabled}
                          onChange={(e) => handleNutrientChange(index, e)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="max_value"
                          placeholder="Max Value"
                          className="input input-bordered input-sm w-full max-w-xs rounded-xl"
                          value={nutrient.max_value}
                          pattern="[0-9]*"
                          disabled={isDisabled}
                          onChange={(e) => handleNutrientChange(index, e)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </>
                
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
              onClick = {() => {setIsDisabled(true), setSubmitType('modify')}}
              className={`btn bg-green-button ${isDisabled ? 'disabled bg-red-100' : 'hover:bg-green-600'} rounded-xl px-8 text-white`}
            >

              {`${isDisabled ? 'Creating...' : 'Modify'}`}
            </button>

            {/* <button
              type="submit"
              onClick = {() => {setIsDisabled(true), setSubmitType('formulate')}}
              className={`btn btn-primary ${isDisabled ? 'disabled bg-red-100' : 'hover:bg-primary'} rounded-xl px-8 text-white`}
            >

              {`${isDisabled ? 'Creating...' : 'Formulate'}`}
            </button> */}
          </div>
        </form>
      </>
      <ChooseIngredientsModal
        isOpen={isChooseIngredientsModalOpen}
        onClose={() => setIsChooseIngredientsModalOpen(false)}
        ingredients={ingredientsMenu}
        onResult={handleAddIngredients}
        ingredientsFilter={filterIngredientCode}
      />
      <Toast
        className="transition delay-150 ease-in-out"
        show={showToast}
        action={toastAction}
        message={message}
        onHide={hideToast}
      />
    </>
  )
}

export default GroupIdentify