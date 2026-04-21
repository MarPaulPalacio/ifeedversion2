import Ingredient from '../models/ingredient-model.js';
import UserIngredientOverride from '../models/user_ingredient_override-model.js';
import Nutrient from '../models/nutrient-model.js';

// const cloudinary = require('../config/cloudinary');

const createIngredient = async (req, res) => {
  const {
    name, 
    price, 
    available, 
    group, 
    description, 
    source, 
    nutrients, 
    user,
    image // 1. Extract image from request body
  } = req.body;

  try {
    const newIngredient = await Ingredient.create({
      name, 
      price, 
      available, 
      group, 
      description, 
      source, 
      nutrients, 
      user,
      // 2. Map the image object to the database record
      // We use optional chaining or a default object to prevent errors if image is missing
      image: {
        url: image?.url || '',
        public_id: image?.public_id || ''
      }
    });

    res.status(200).json({ message: 'success', ingredients: newIngredient });
  } catch (err) {
    // If there's a validation error (like a missing required field), it lands here
    res.status(500).json({ error: err.message, message: 'error' });
  }
};

const getAllIngredients = async (req, res) => {
  const { userId } = req.params;
  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 8;

  try {
    // user-created ingredients
    // const userIngredients = await Ingredient.find({'user': userId});
    const userIngredients = await Ingredient.find({});
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

// GET ingredients by a list of IDs
const getIngredientsByIds = async (req, res) => {
  try {
    console.log("IDS HERE", req)
    // Expect IDs as a JSON array in query (GET) or body (POST)
    const { ids } = req.body; // e.g., [ "id1", "id2", "id3" ]
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No ingredient IDs provided.' });
    }
    
    console.log("IDS", ids)
    // Find ingredients by _id in MongoDB
    const ingredients = await Ingredient.find({ _id: { $in: ids } });

    console.log(ingredients, "Ingredients are here: ")
    // Include global ingredients and overrides if needed
    // const userId = req.body.userId; // if you want to merge global
    // const globalIngredients = await handleGetIngredientGlobalAndOverride(userId);
    // const allIngredients = [...globalIngredients, ...ingredients];

    const formattedIngredients = ingredients.map((ingredient) => {
      const data = ingredient._doc || ingredient;
      return {
        ...data,
        price: Number(data.price).toFixed(2),
        group: data.group || 'Uncategorized',
      };
    });

    res.status(200).json({
      message: 'success',
      ingredients: formattedIngredients,
    });
  } catch (err) {
    res.status(500).json({ message: 'error', error: err.message });
  }
};

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
    // const userIngredients = await Ingredient.find({'user': userId});
    const userIngredients = await Ingredient.find({});
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
  // 1. Add 'image' to the destructured body
  const { name, price, available, group, description, nutrients, image } = req.body;
  
  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ message: 'error' });
    }

    // user-created ingredient
    if (ingredient.source === 'user') {
      if (name) ingredient.name = name;
      if (price !== undefined) ingredient.price = price;
      if (available !== undefined) ingredient.available = available;
      if (group) ingredient.group = group;
      if (description !== undefined) ingredient.description = description;
      if (nutrients) ingredient.nutrients = nutrients;

      // 2. Handle the image update
      if (image) {
        ingredient.image = {
          url: image.url || '',
          public_id: image.public_id || ''
        };
      }

      const updatedIngredient = await ingredient.save();
      res.status(200).json({ message: 'success', ingredients: updatedIngredient });
    }
    // global-created ingredient
    else {
      // 3. Ensure image is passed into your override handler
      const updatedIngredient = await handleUpdateIngredientOverride(
        ingredient, 
        name, 
        price, 
        available, 
        group, 
        description, 
        nutrients, 
        id, 
        userId,
        image // Pass image here
      );
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
  const { ingredientsData, type } = req.body;

  try {
    if (!ingredientsData || !Array.isArray(ingredientsData)) {
      return res.status(400).json({ message: "Invalid data format." });
    }

    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // --- STEP 1: PRE-PROCESS DEDUPLICATION (INCOMING DATA) ---
    // If the Excel itself has "Mung Bean" twice, we only take the first one.
    const uniqueIncomingData = [];
    const seenNamesInImport = new Set();

    ingredientsData.forEach(item => {
      const nameKey = item.name.trim().toLowerCase();
      if (!seenNamesInImport.has(nameKey)) {
        seenNamesInImport.add(nameKey);
        uniqueIncomingData.push(item);
      }
    });

    // --- STEP 2: PROCESS NUTRIENTS ---
    const nutrientInfoMap = new Map(); 
    uniqueIncomingData.forEach(ingredient => {
      ingredient.nutrients.forEach(nut => {
        const nutrientName = nut.nutrient || ""; 
        const nameKey = nutrientName.trim().toLowerCase();
        if (nameKey && !nutrientInfoMap.has(nameKey)) {
          nutrientInfoMap.set(nameKey, { 
            id: nut.nutrient_id, 
            name: nutrientName.trim() 
          });
        }
      });
    });

    const nutrientLookupCache = {};
    for (const [nameKey, info] of nutrientInfoMap) {
      let existingNutrient = null;
      if (info.id) existingNutrient = await Nutrient.findById(info.id);
      
      if (!existingNutrient) {
        existingNutrient = await Nutrient.findOne({
          $or: [{ user: userId }, { source: 'global' }],
          name: { $regex: new RegExp('^' + escapeRegex(info.name) + '$', 'i') }
        });
      }

      if (existingNutrient) {
        nutrientLookupCache[nameKey] = existingNutrient._id;
      } else {
        const nutrientData = {
          name: info.name,
          abbreviation: info.name.substring(0, 3).toUpperCase(),
          unit: '%',
          source: 'user',
          user: userId,
          ...(info.id && { _id: info.id })
        };
        const newNutrient = await Nutrient.create(nutrientData);
        await handleIngredientChanges(newNutrient, userId);
        nutrientLookupCache[nameKey] = newNutrient._id;
      }
    }

    const allNutrients = await Nutrient.find({
      $or: [{ user: userId }, { source: 'global' }]
    });

    // --- STEP 3: FILTER AGAINST EXISTING DATABASE ENTRIES ---
    const finalNewIngredients = await Promise.all(
      uniqueIncomingData.map(async (ingredient) => {
        const existing = await Ingredient.findOne({
          $or: [{ user: userId }, { source: 'global' }],
          name: { $regex: new RegExp('^' + escapeRegex(ingredient.name) + '$', 'i') }
        });
        return existing ? null : ingredient;
      })
    ).then(results => results.filter(res => res !== null));

    // --- STEP 4: BUILD FINAL OBJECTS INCLUDING IMAGES ---
    const processedIngredients = finalNewIngredients.map(ingredient => {
      const providedValues = {};
      ingredient.nutrients.forEach(nut => {
        const nameKey = (nut.nutrient || "").trim().toLowerCase(); 
        providedValues[nameKey] = nut.value;
      });

      const processedNutrients = allNutrients.map(nut => ({
        nutrient: nut._id,
        value: providedValues[nut.name.toLowerCase()] ?? 0
      }));

      return {
        name: ingredient.name,
        price: ingredient.price || 10,
        available: 1,
        group: type || ingredient.category || '',
        description: ingredient.description || '', // Added description support
        user: userId,
        source: 'user',
        nutrients: processedNutrients,
        // --- IMAGE STORAGE ADDED HERE ---
        image: {
          url: ingredient.image?.url || '',
          public_id: ingredient.image?.public_id || ''
        }
      };
    });

    const newIngredients = await Ingredient.insertMany(processedIngredients);

    res.status(200).json({
      message: 'success',
      ingredients: newIngredients,
      skipped: ingredientsData.length - newIngredients.length
    });
  } catch (err) {
    console.error("Import Error: ", err);
    res.status(500).json({ error: err.message });
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
  getIngredientsByIds,
};