import Formulation from '../models/formulation-model.js';
import SpecialFormulation from '../models/special-formulation-model.js';
import Ingredient from '../models/ingredient-model.js';
import Nutrient from '../models/nutrient-model.js';
import User from '../models/user-model.js';
import Cow from "../models/cow_nutrient_constraint.js";


const createFormulation = async (req, res) => {
    const {
        code, name, description, animal_group, body_weight, ownerId, ownerName, nutrients
    } = req.body;
    try {
        const User = (await import('../models/user-model.js')).default;
        const owner = await User.findById(ownerId);
        const isTemplate = owner && owner.userType === 'admin';
        const newFormulation = await Formulation.create({
            code, name, description, animal_group, 
            collaborators: [{ userId: ownerId, access: 'owner', displayName: ownerName }],
            isTemplate, nutrients, weight:parseInt(body_weight)
        });
        console.log("New formulation created:", body_weight);
        const filteredFormulation = {
            "_id": newFormulation._id,
            "code": code,
            "name": name,
            "description": description ? description : "",
            "animal_group": animal_group ? animal_group : "",
            "isTemplate": isTemplate,
            "nutrients": nutrients,
            "weight": parseInt(body_weight),
        }
        res.status(200).json({ message: 'success', formulations: filteredFormulation });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
};

const getCowFormulation = async (req, res) => {
    const weight = Number(req.query.weight);
    console.log("Weight received:", weight);
    try {
        const cowFormulation = await Cow.findOne({ weight }).populate('nutrientrequirement.nutrientid');
        if (!cowFormulation) {
            return res.status(404).json({ message: 'Cow formulation not found' });
        }
        res.status(200).json({ message: 'success', formulation: cowFormulation });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' });
    }
};

const getAllFormulations = async (req, res) => {
    const { collaboratorId } = req.params;
    const { skip=0, limit=8 } = req.query;

    try {
        // only show formulations where the user is part of the collaborators
        const formulations = await Formulation.find({'collaborators.userId': collaboratorId}).select('code name description animal_group collaborators createdAt');
        // aside from the basic details, return the access level of the user
        const filteredFormulations = formulations.map(formulation => {
            const access = formulation.collaborators.find(c => c.userId.toString() === collaboratorId)?.access;
            return {
                "_id": formulation._id,
                "code": formulation.code,
                "name": formulation.name,
                "description": formulation.description ? formulation.description : "",
                "animal_group": formulation.animal_group ? formulation.animal_group : "",
                "access": access,
                "createdAt": formulation.createdAt
            }
        })

        // pagination
        const totalCount = filteredFormulations.length;
        const paginatedFormulations = filteredFormulations.slice(skip, skip + limit);

        res.status(200).json({
            message: 'success',
            formulations: paginatedFormulations,
            pagination: {
                totalSize: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                pageSize: paginatedFormulations.length,
                page: Math.floor(skip / limit) + 1,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
};

const getAllSpecialFormulations = async (req, res) => {
    const { animalgroup } = req.params;
    const { skip=0, limit=8 } = req.query;

    try {
        // console.log("SHOWING SPECIAL FORMULATIONS")
        // only show formulations where the user is part of the collaborators
        const formulations = await SpecialFormulation.find({'animal_group': animalgroup}).select('code name description animal_group collaborators createdAt ingredients nutrients');
        // aside from the basic details, return the access level of the user
        // const filteredFormulations = formulations.map(formulation => {
        //     const access = formulation.collaborators.find(c => c.userId.toString() === collaboratorId)?.access;
        //     return {
        //         "_id": formulation._id,
        //         "code": formulation.code,
        //         "name": formulation.name,
        //         "description": formulation.description ? formulation.description : "",
        //         "animal_group": formulation.animal_group ? formulation.animal_group : "",
        //         "access": access,
        //         "createdAt": formulation.createdAt
        //     }
        // })

        // pagination
        const totalCount = formulations.length;
        const paginatedFormulations = formulations.slice(skip, skip + limit);

        res.status(200).json({
            message: 'success',
            formulations: paginatedFormulations,
            pagination: {
                totalSize: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                pageSize: paginatedFormulations.length,
                page: Math.floor(skip / limit) + 1,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
};


const getFormulation = async (req, res) => {
    const { id } = req.params;
    try {
        const formulation = await Formulation.findById(id);
        if (!formulation) {
            return res.status(404).json({ message: 'Formulation not found' });
        }
        res.status(200).json({ message: 'success', formulations: formulation });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
};

const getFormulationByFilters = async (req, res) => {
    const {
        searchQuery = '',
        skip = 0, limit = 10,
        sortBy, sortOrder,
        filterBy = 'animal_group', filters
    } = req.query;
    const { userId } = req.params;
    try {
        let formulations = await Formulation.find({'collaborators.userId': userId})
        if (!formulations) {
            return res.status(404).json({ message: 'No formulations', fetched: [] });
        }
        // partial matching
        formulations = formulations.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Filter the results
        if (filters) {
            const filtersArr = filters.split(',')
            if (filterBy === 'group') {
                formulations = formulations.filter(item => {
                    return filtersArr.includes(item.group)
                })
            } else {
                formulations = formulations.filter(item => {
                    return filtersArr.includes(item.animal_group)
                })
            }
        }

        // Sort the results
        formulations.sort((a, b) => {
            if (sortBy === 'name') {
                if (sortOrder === 'asc') {
                    return a?.name?.toString().localeCompare(b?.name?.toString() || '');
                } else {
                    return b?.name?.toString().localeCompare(a?.name?.toString() || '');
                }
            } else if (sortBy === 'group') {
                if (sortOrder === 'asc') {
                    return a?.group?.toString().localeCompare(b?.group?.toString() || '');
                } else {
                    return b?.group?.toString().localeCompare(a?.group?.toString() || '');
                }
            } else if (sortBy === 'animal_group') {
                if (sortOrder === 'asc') {
                    return a?.animal_group?.toString().localeCompare(b?.animal_group?.toString() || '');
                } else {
                    return b?.animal_group?.toString().localeCompare(a?.animal_group?.toString() || '');
                }
            }
        });

        const formattedFormulations = formulations.map(formulation => {
            const access = formulation.collaborators.find(c => c.userId.toString() === userId)?.access;
            return {
                "_id": formulation._id,
                "code": formulation.code,
                "name": formulation.name,
                "description": formulation.description ? formulation.description : "",
                "animal_group": formulation.animal_group ? formulation.animal_group : "",
                "access": access,
                "createdAt": formulation.createdAt
            }
        })

        // pagination
        const totalCount = formattedFormulations.length;
        const paginatedFormulations = formattedFormulations.slice(skip, skip + limit);

        res.status(200).json({
            message: 'success',
            fetched: paginatedFormulations,
            pagination: {
                totalSize: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                pageSize: paginatedFormulations.length,
                page: Math.floor(skip / limit) + 1,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
}


const updateFormulation = async (req, res) => {
    const { id } = req.params;
    let { code, name, description, animal_group, cost, weight, ingredients, nutrients, nutrientRatioConstraints } = req.body;
    
    // // Ensure both name and ID fields are preserved in nutrientRatioConstraints (fix for data persistence issue when using the solver)
    nutrientRatioConstraints = (nutrientRatioConstraints || []).map(constraint => {
      return {
        firstIngredient: constraint.firstIngredient,
        firstIngredientId: constraint.firstIngredientId,
        secondIngredient: constraint.secondIngredient,
        secondIngredientId: constraint.secondIngredientId,
        operator: constraint.operator,
        firstIngredientRatio: constraint.firstIngredientRatio,
        secondIngredientRatio: constraint.secondIngredientRatio
      }
    });
    try {
        const formulation = await Formulation.findByIdAndUpdate(
          id,
          {
              $set:
                {
                    code, name, description, animal_group, cost, weight, ingredients, nutrients, nutrientRatioConstraints
                }
          },
          { new: true },
        );
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        }
        const filteredFormulation = {
            "_id": formulation._id,
            "code": code,
            "name": name,
            "description": description ? description : "",
            "animal_group": animal_group ? animal_group : "",
            "cost": cost,
            "weight": weight ? weight : 100,
            "ingredients": ingredients ? ingredients : [],
            "nutrients": nutrients ? nutrients : [],
            "nutrientRatioConstraints": nutrientRatioConstraints ? nutrientRatioConstraints : [],
        }
        res.status(200).json({ message: 'success', formulations: filteredFormulation });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
};


const deleteFormulation = async (req, res) => {
    const { id } = req.params;
    try {
        const formulation = await Formulation.findByIdAndDelete(id);
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        }
        res.status(200).json({ message: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
};

const getFormulationOwner = async (req, res) => {
    const { id } = req.params;
    try {
        const formulation = await Formulation.findById(id);
        const owner = formulation.collaborators.filter(item => item.access === 'owner');
        if (owner.length === 0) {
            return res.status(404).json({ message: 'error' });
        }
        res.status(200).json({ message: 'success', owner: owner[0] });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
}

const addIngredients = async (req, res) => {
    const { id } = req.params;
    const { ingredients } = req.body;
    try {
        const formulation = await Formulation.findByIdAndUpdate(
          id,
          {
              $push:
                {
                    ingredients: { $each: ingredients },
                }
          },
          { new: true },
        );
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        }
        res.status(200).json({ message: 'success', addedIngredients: ingredients });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
}

const addNutrients = async (req, res) => {
    const { id } = req.params;
    const { nutrients } = req.body;

    try {
        const formulation = await Formulation.findByIdAndUpdate(
          id,
          {
              $push:
                {
                    nutrients: { $each: nutrients },
                }
          },
          { new: true },
        );
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        }
        res.status(200).json({ message: 'success', addedNutrients: nutrients });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
}

const removeIngredient = async (req, res) => {
    const { id, ingredient_id } = req.params;
    try {
        const formulation = await Formulation.findByIdAndUpdate(
          id,
          {
              $pull:
                {
                    ingredients: { ingredient_id: ingredient_id },
                }
          },
          { new: true },
        );
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        }
        res.status(200).json({ message: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
}

const removeNutrient = async (req, res) => {
    const { id, nutrient_id } = req.params;

    try {
        const formulation = await Formulation.findByIdAndUpdate(
          id,
          {
              $pull:
                {
                    nutrients: { nutrient_id: nutrient_id },
                }
          },
          { new: true },
        );
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        }
        res.status(200).json({ message: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
}

const validateCollaborator = async (req, res) => {
    const { formulationId, collaboratorId } = req.params;
    try {
        const formulation = await Formulation.findById(formulationId);
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        }
        // check the list of collaborators under the Formulation and see the user's access level
        const collaborator = formulation.collaborators.find(c => c.userId.toString() === collaboratorId);
        if (!collaborator) {
            return res.status(200).json({ message: 'success', access: 'notFound' });
        }
        res.status(200).json({ message: 'success', access: collaborator.access });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
};


const updateCollaborator = async (req,res) => {
    const { id } = req.params;
    const { updaterId, collaboratorId, access, displayName } = req.body;
    // there should only be one owner
    if (access === 'owner') return res.status(400).json({ message: 'error' })
    try {
        const formulation = await Formulation.findById(id);
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        };
        // owner is the only one who can update
        const updater = formulation.collaborators.find(c => c.userId.toString() === updaterId);
        if (updater.access !== 'owner') {
            return res.status(401).json({ message: 'error' });
        }
        const collaborator = formulation.collaborators.find(c => c.userId.toString() === collaboratorId);
        if (!collaborator) {
            formulation.collaborators.push({ userId: collaboratorId, access: access, displayName: displayName });
            await formulation.save();
            return res.status(200).json({ message: 'success' });
        }
        if (collaborator.access === access) {
            return res.status(200).json({ message: 'success' });
        }
        collaborator.access = access;
        await formulation.save();
        res.status(200).json({ message: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
};

const removeCollaborator = async (req,res) => {
    const { formulationId, collaboratorId } = req.params;
    try {
        const formulation = await Formulation.findById(formulationId);
        if (!formulation) {
            return res.status(404).json({ message: 'error' });
        }
        // owner cannot be removed
        const toRemoveisOwner = formulation.collaborators.find(
          c => c.userId.toString() === collaboratorId && c.access === 'owner'
        );
        if (toRemoveisOwner) {
            return res.status(403).json({
                message: 'error',
            });
        }

        // remove the collaborator
        const updatedFormulation = await Formulation.findByIdAndUpdate(
          formulationId,
          {
              $pull: {
                  collaborators: { userId: collaboratorId }
              }
          },
          { new: true }
        );

        if (!updatedFormulation) {
            return res.status(404).json({ message: 'error' });
        }

        res.status(200).json({
            message: 'success',
            formulation: updatedFormulation
        });


    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
}

const getAllTemplateFormulations = async (req, res) => {
    try {
        const formulations = await Formulation.find({ isTemplate: true });
        res.status(200).json({
            message: 'success',
            formulations
        });
    } catch (err) {
        res.status(500).json({ error: err.message, message: 'error' })
    }
}

const cloneTemplateToFormulation = async (req, res) => {
  const { id: newFormulaId } = req.params;
  const { templateId, userId } = req.body;
  try {
    // Fetch template and new formula
    const template = await Formulation.findById(templateId);
    const newFormula = await Formulation.findById(newFormulaId);
    if (!template || !newFormula) {
      return res.status(404).json({ message: 'Template or new formula not found' });
    }

    // Clone Nutrients
    const nutrientNameToUserNutrient = {};
    const clonedNutrients = [];
    const templateDescription = `From template: ${template.name} (${template.animal_group})`;
    for (const n of template.nutrients) {
      // Fetch the full nutrient document from the Nutrient collection
      let templateNutrientDoc = null;
      if (n.nutrient_id) {
        templateNutrientDoc = await Nutrient.findById(n.nutrient_id);
      }
      // Fallback: use summary if not found
      const nutrientName = templateNutrientDoc ? templateNutrientDoc.name : n.name;
      let userNutrient = await Nutrient.findOne({ name: nutrientName, user: userId });
      if (!userNutrient) {
        userNutrient = await Nutrient.create({
          abbreviation: templateNutrientDoc?.abbreviation || n.abbreviation || nutrientName.substring(0, 3).toUpperCase(),
          name: nutrientName,
          unit: templateNutrientDoc?.unit || n.unit || '',
          description: templateDescription,
          group: templateNutrientDoc?.group || n.group || '',
          source: 'user',
          user: userId
        });
      }
      nutrientNameToUserNutrient[nutrientName] = userNutrient;
      clonedNutrients.push({
        nutrient_id: userNutrient._id,
        name: userNutrient.name,
        minimum: n.minimum,
        maximum: n.maximum,
        value: n.value
      });
    }

    // Clone Ingredients
    const clonedIngredients = [];
    for (const i of template.ingredients) {
      // Fetch the full ingredient document from the Ingredient collection
      const templateIngredientDoc = await Ingredient.findById(i.ingredient_id);
      if (!templateIngredientDoc) continue;
      // Check if the user already has an ingredient with the same name
      let userIngredient = await Ingredient.findOne({ name: templateIngredientDoc.name, user: userId });
      if (!userIngredient) {
        // Build nutrients array for this ingredient using the nutrient name map
        const ingredientNutrients = [];
        if (templateIngredientDoc.nutrients && Array.isArray(templateIngredientDoc.nutrients)) {
          for (const n of templateIngredientDoc.nutrients) {
            // Find the nutrient name from the nutrient document
            let nutrientDoc = null;
            if (n.nutrient) {
              nutrientDoc = await Nutrient.findById(n.nutrient);
            }
            const nutrientName = nutrientDoc ? nutrientDoc.name : null;
            if (nutrientName && nutrientNameToUserNutrient[nutrientName]) {
              ingredientNutrients.push({
                nutrient: nutrientNameToUserNutrient[nutrientName]._id,
                value: n.value
              });
            }
          }
        }
        // Create a new ingredient for the user
        userIngredient = await Ingredient.create({
          name: templateIngredientDoc.name,
          price: templateIngredientDoc.price || 0,
          available: templateIngredientDoc.available || 1,
          group: templateIngredientDoc.group || '',
          description: templateDescription,
          source: 'user',
          user: userId,
          nutrients: ingredientNutrients
        });
      }
      clonedIngredients.push({
        ingredient_id: userIngredient._id,
        name: userIngredient.name,
        minimum: i.minimum,
        maximum: i.maximum,
        value: i.value
      });
    }

    // Clone Nutrient Ratio Constraints
    const clonedRatios = (template.nutrientRatioConstraints || []).map(r => ({ ...r.toObject?.() || r }));

    // Update the new formula
    newFormula.ingredients = clonedIngredients;
    newFormula.nutrients = clonedNutrients;
    newFormula.nutrientRatioConstraints = clonedRatios;
    await newFormula.save();

    res.status(200).json({ message: 'success', formulations: newFormula });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'error', error: err.message });
  }
};


export {
    createFormulation,
    getAllFormulations,
    getAllSpecialFormulations,
    getFormulation,
    getFormulationByFilters,
    updateFormulation,
    deleteFormulation,
    getFormulationOwner,
    addIngredients,
    addNutrients,
    removeIngredient,
    removeNutrient,
    validateCollaborator,
    updateCollaborator,
    removeCollaborator,
    getAllTemplateFormulations,
    cloneTemplateToFormulation,
    getCowFormulation
};