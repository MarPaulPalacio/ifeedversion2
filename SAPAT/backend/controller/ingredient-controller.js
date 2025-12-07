import Ingredient from '../models/ingredient-model.js';
import UserIngredientOverride from '../models/user_ingredient_override-model.js';
import Nutrient from '../models/nutrient-model.js';

const createIngredient = async (req, res) => {
  const {
      name, price, available, group, description, source, nutrients, user,
  } = req.body;

  try {
    const newIngredient = await Ingredient.create({
      name, price, available, group, description, source, nutrients, user
    });
    res.status(200).json({ message: 'success', ingredients: newIngredient });
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'error' })
  }
};

const getAllIngredients = async (req, res) => {
  const { userId } = req.params;
  const { skip=0, limit=8 } = req.query;

  try {
    // user-created ingredients
    const userIngredients = await Ingredient.find({'user': userId});
    //  global ingredients (and overrides)
    const globalIngredients = await handleGetIngredientGlobalAndOverride(userId);
    const ingredients = [...globalIngredients, ...userIngredients];
    const formattedIngredients = ingredients.map((ingredient) => {
      const data = ingredient._doc || ingredient;
      return {
        ...data,
        price: Number(data.price).toFixed(2),
        group: data.group || 'Uncategorized',
      };
    })

    // pagination
    const totalCount = formattedIngredients.length;
    const paginatedIngredients = formattedIngredients.slice(skip, skip + limit);

    res.status(200).json({
      message: 'success',
      ingredients: paginatedIngredients,
      pagination: {
        totalSize: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        pageSize: paginatedIngredients.length,
        page: Math.floor(skip / limit) + 1,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'error' })
  }
};

const getIngredient = async (req, res) => {
  const { id, userId } = req.params;
  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }
    if (ingredient.source === 'global') {
      const override = await UserIngredientOverride.find({ingredient_id: ingredient._id, user: userId});
      if (override.length !== 0) {
        return res.status(200).json({ message: 'success', ingredients: override[0] });
      }
    }
    res.status(200).json({ message: 'success', ingredients: ingredient });
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'error' })
  }
}


const getIngredientsByFilters = async (req, res) => {
  const {
    searchQuery = '',
    skip = 0, limit = 10,
    sortBy, sortOrder,
    filterBy = 'group', filters
  } = req.query;
  const { userId } = req.params;
  try {
    // user-created ingredients
    const userIngredients = await Ingredient.find({'user': userId});
    //  global ingredients (and overrides)
    const globalIngredients = await handleGetIngredientGlobalAndOverride(userId);
    let ingredients = [...globalIngredients, ...userIngredients];

    // partial matching for search
    if (searchQuery) {
      ingredients = ingredients.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter the results
    if (filters) {
      const filtersArr = filters.split(',')
      ingredients = ingredients.filter(item => {
        return filtersArr.includes(item.group)
      })
    }

    // Sort the results
    ingredients.sort((a, b) => {
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

    // pagination
    const totalCount = ingredients.length;
    const paginatedIngredients = ingredients.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

    res.status(200).json({
      message: 'success',
      fetched: paginatedIngredients,
      pagination: {
        totalSize: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        pageSize: paginatedIngredients.length,
        page: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'error' })
  }
}

const updateIngredient = async (req, res) => {
  const { id, userId } = req.params;
  const { name, price, available, group, description, nutrients } = req.body;
  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ message: 'error' });
    }

    // user-created ingredient
    if (ingredient.source === 'user') {
      if (name) ingredient.name = name;
      if (price) ingredient.price = price;
      if (available) ingredient.available = available;
      if (group) ingredient.group = group;
      if (description) ingredient.description = description;
      if (nutrients) ingredient.nutrients = nutrients;
      const updatedIngredient = await ingredient.save();
      res.status(200).json({ message: 'success', ingredients: updatedIngredient });
    }
    // global-created ingredient
    else {
      // revisions on the userIngredientOverride
      const updatedIngredient = await handleUpdateIngredientOverride(ingredient, name, price, available, group, description, nutrients, id, userId);
      res.status(200).json({ message: 'success', ingredients: updatedIngredient });
    }
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'error' })
  }
};

const deleteIngredient = async (req, res) => {
  const { id, userId } = req.params;
  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ message: 'error' });
    }

    // user-created ingredient
    if (ingredient.source === 'user') {
      const ingredient = await Ingredient.findByIdAndDelete(id);
    }
    // global-created ingredient
    else {
      // revisions on the userIngredientOverride
      await handleDeleteIngredientOverride(id, userId);
    }
    res.status(200).json({ message: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'error' })
  }
};

//
// const importIngredient = async (req, res) => {
//   const ingredientsData = req.body;  // Get the ingredients data from the request body
//   try {
//     // Validate that the incoming data is an array
//     if (!ingredientsData || !Array.isArray(ingredientsData)) {
//       return res.status(400).json({ message: "Invalid data format, expected an array of ingredients." });
//     }
//     // Validate that required fields are there
//     if (ingredientsData.some(item => !item.name || !item.price || !item.nutrients)) {
//       return res.status(400).json({ message: "Each ingredient must have a 'name' and 'quantity'." });
//     }
//
//     const newIngredients = await Ingredient.insertMany(ingredientsData);
//     res.status(200).json({ message: 'success', ingredients: newIngredients });
//   } catch (err) {
//     res.status(500).json({ error: err.message, message: 'error' });
//   }
// }

const importIngredient = async (req, res) => {
  const { userId } = req.params;
  const ingredientsData = req.body;

  try {
    // Validate that the incoming data is an array
    if (!ingredientsData || !Array.isArray(ingredientsData)) {
      return res.status(400).json({ message: "Invalid data format, expected an array of ingredients." });
    }

    // Validate that required fields are there
    if (ingredientsData.some(item => !item.name || !item.price || !item.nutrients)) {
      return res.status(400).json({ message: "Each ingredient must have a name, price, and nutrients." });
    }

    // Escape special regex characters
    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // First, collect all unique nutrient names across all ingredients
    const allNutrientNames = new Set();
    ingredientsData.forEach(ingredient => {
      ingredient.nutrients.forEach(nutrient => {
        allNutrientNames.add(nutrient.nutrient.trim());
      });
    });

    // Create a nutrient lookup cache to avoid duplicate lookups/creations
    const nutrientLookupCache = {};

    // Process all nutrient names first to ensure they exist
    for (const nutrientName of allNutrientNames) {
      const existingNutrient = await Nutrient.findOne({
        $or: [
          { user: userId },
          { source: 'global' }
        ],
        name: { $regex: new RegExp('^' + escapeRegex(nutrientName) + '$', 'i') }
      });

      console.log(`${nutrientName} existing? ${existingNutrient ? 'yes' : 'no'}`);

      if (existingNutrient) {
        nutrientLookupCache[nutrientName.toLowerCase()] = existingNutrient._id;
      } else {
        // Create a new nutrient
        const newNutrient = await Nutrient.create({
          name: nutrientName,
          abbreviation: nutrientName.substring(0, 3).toUpperCase(),
          unit: '',
          group: '',
          description: '',
          source: 'user',
          user: userId
        });

        // when nutrient is created, update all user ingredients
        await handleIngredientChanges(newNutrient, userId);
        nutrientLookupCache[nutrientName.toLowerCase()] = newNutrient._id;
      }
    }

    // Get ALL existing nutrients for this user to ensure complete nutrient lists
    const allNutrients = await Nutrient.find({
      $or: [
        { user: userId },
        { source: 'global' }
      ]
    });

    // Add all existing nutrients to the cache
    allNutrients.forEach(nutrient => {
      if (!nutrientLookupCache[nutrient.name.toLowerCase()]) {
        nutrientLookupCache[nutrient.name.toLowerCase()] = nutrient._id;
      }
    });

    // Check for existing ingredients
    const newIngredientsData = await Promise.all(
      ingredientsData.map(async (ingredient) => {
        const existingIngredient = await Ingredient.findOne({
          $or: [
            { user: userId },
            { source: 'global' }
          ],
          name: { $regex: new RegExp('^' + escapeRegex(ingredient.name) + '$', 'i') }
        });

        return existingIngredient ? null : ingredient;
      })
    ).then(results => results.filter(result => result !== null));

    // Process all new ingredients using the cache
    const processedIngredients = newIngredientsData.map(ingredient => {
      // Create a map of provided nutrient values by name (lowercase for case-insensitivity)
      const providedNutrients = {};
      ingredient.nutrients.forEach(nutrientData => {
        providedNutrients[nutrientData.nutrient.trim().toLowerCase()] = nutrientData.value;
      });

      // Process each nutrient, including all existing ones
      const processedNutrients = allNutrients.map(nutrient => {
        const nutrientNameLower = nutrient.name.toLowerCase();
        return {
          nutrient: nutrient._id,
          // Use provided value if it exists, otherwise default to 0
          value: providedNutrients[nutrientNameLower] !== undefined
            ? providedNutrients[nutrientNameLower]
            : 0
        };
      });

      // Create the ingredient with ALL nutrients
      return {
        name: ingredient.name,
        price: ingredient.price,
        available: ingredient.available || 1,
        group: '',
        source: ingredient.source || 'user',
        user: userId,
        nutrients: processedNutrients
      };
    });

    // Insert all processed new ingredients
    const newIngredients = await Ingredient.insertMany(processedIngredients);

    res.status(200).json({
      message: 'success',
      ingredients: newIngredients,
      skippedIngredients: ingredientsData.length - newIngredients.length
    });
  } catch (err) {
    console.log("err heree: ", err)
    res.status(500).json({ error: err.message, message: 'error' });
  }
};

// helpers
const handleGetIngredientGlobalAndOverride = async (userId) => {
  try {
    const globalIngredients = await Ingredient.find({ 'source': "global" });
    const allIngredients = await Promise.all(globalIngredients.map(async ingredient => {
      const override = await UserIngredientOverride.find({'ingredient_id': ingredient._id, 'user': userId});
      // there are no overrides
      if (override.length === 0) {
        return ingredient;
      }
      // there is an override that is not deleted
      if (override[0].deleted !== 1) {
        return override[0]; // assuming that each global ingredient has at most one override
      }
      // there is an override that is deleted
      return undefined;
    }))
    return allIngredients.filter(item => item !== undefined);
  } catch (err) {
    console.log(err);
  }
}

const handleUpdateIngredientOverride = async (globalIngredient, name, price, available, group, description, nutrients, ingredient_id, user_id) => {
  try {
    const ingredient = await UserIngredientOverride.find({ 'ingredient_id': ingredient_id, "user": user_id });
    // there is no override yet
    if (ingredient.length === 0) {
      const updatedIngredient = {
        ...globalIngredient,
        name: name ?? globalIngredient.name,
        price: price ?? globalIngredient.price,
        available: available ?? globalIngredient.available,
        group: group ?? globalIngredient.group,
        description: description ?? globalIngredient.description,
        nutrients: nutrients ?? globalIngredient.nutrients,
      }
      const ingredientOverride = await UserIngredientOverride.create({
        ...updatedIngredient,
        ingredient_id,
        user: user_id
      });
      return ingredientOverride;
    }
    // there is an existing override
    else {
      if (ingredient_id) ingredient[0].ingredient_id = ingredient_id;
      if (name) ingredient[0].name = name;
      if (price) ingredient[0].price = price;
      if (available) ingredient[0].available = available;
      if (group) ingredient[0].group = group;
      if (description) ingredient[0].description = description;
      if (nutrients) ingredient[0].nutrients = nutrients;
      await ingredient[0].save();
      return ingredient[0];
    }
  } catch (err) {
    console.log(err);
  }
};


const handleDeleteIngredientOverride = async (ingredient_id, user_id) => {
  try {
    const ingredient = await UserIngredientOverride.find({ 'ingredient_id': ingredient_id, 'user': user_id });
    if (ingredient.length === 0) {
      await UserIngredientOverride.create({
        ingredient_id,
        "deleted": 1,
        "user": user_id,
      });
    } else {
      ingredient[0].deleted = 1;
      await ingredient[0].save();
    }
  } catch (err) {
    console.log(err);
  }
}

const handleIngredientChanges = async (nutrient, user_id) => {
  // <user-created ingredients>
  const userIngredients = await Ingredient.find({ 'user': user_id });
  await Promise.all(userIngredients.map(async userIngredient => {
    // insert the new nutrient to list of nutrients on each User Ingredient
    userIngredient.nutrients.push({ 'nutrient': nutrient._id, 'value': 0 });
    await userIngredient.save();
  }));

  // <global overrides ingredients>
  const globalIngredients = await Ingredient.find({ 'source': 'global' });
  await Promise.all(globalIngredients.map(async globalIngredient => {
    const override = await UserIngredientOverride.find({ 'ingredient_id': globalIngredient._id, 'user': user_id });
    // no existing override
    if (override.length === 0) {
      await UserIngredientOverride.create({
        ingredient_id: globalIngredient._id,
        user: user_id,
        nutrients: [
          ...globalIngredient.nutrients,
          { 'nutrient': nutrient._id, 'value': 0 }
        ],
        // Copy other relevant fields from globalIngredient
        name: globalIngredient.name,
        price: globalIngredient.price,
        available: globalIngredient.available,
        source: globalIngredient.source,
        group: globalIngredient.group,
        description: globalIngredient.description,
      });
    }
    // has an existing override (and not deleted as well)
    else if (override[0].deleted !== 1) {
      override[0].nutrients.push({ 'nutrient': nutrient._id, 'value': 0 });
      await override[0].save();
    }
  }));
}


export {
  createIngredient,
  getAllIngredients,
  getIngredient,
  getIngredientsByFilters,
  updateIngredient,
  deleteIngredient,
  importIngredient,
};