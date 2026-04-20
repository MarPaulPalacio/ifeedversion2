import { kmeans } from 'ml-kmeans';
import { getAllIngredients } from './ingredient-controller.js';

// --- EXACT COPY OF YOUR FETCH FUNCTION ---
const fetchIngredientsData = async (userId, skip = 0, limit = 10000) => {
  try {
    const mockReq = {
      params: { userId: userId },
      query: { skip, limit }
    };

    let ingredientsData;
    const mockRes = {
      status: (code) => {
        return {
          json: (data) => {
            if (code === 200) {
              ingredientsData = data.ingredients;
            }
          }
        };
      }
    };

    await getAllIngredients(mockReq, mockRes);
     console.log("EXACT NUTRIENTS DATA:", JSON.stringify(ingredientsData[0].nutrients, null, 2));
    

    if (ingredientsData) {
       
      return ingredientsData;
    } else {
      return [];
    }
  } catch (err) {
    console.error('Error fetching ingredients data:', err);
    throw err;
  }
}

// --- FORMAT INPUT FOR K-MEANS ---
// --- FORMAT INPUT FOR K-MEANS ---
// Now accepts the nutrients array from the frontend payload
const formatKMeansInput = async (userId, nutrientsPayload) => {
  const ingredientsData = await fetchIngredientsData(userId);

  // 1. Extract the actual Database IDs from the frontend payload
  const idDM = nutrientsPayload.find(n => n.name?.toLowerCase().includes('dry matter') || n.name?.toLowerCase() === 'dm')?.nutrient_id;
  const idCa = nutrientsPayload.find(n => n.name?.toLowerCase().includes('calcium') || n.name?.toLowerCase() === 'ca')?.nutrient_id;
  const idP = nutrientsPayload.find(n => n.name?.toLowerCase().includes('phosphorous') || n.name?.toLowerCase() === 'p')?.nutrient_id;
  const idTDN = nutrientsPayload.find(n => n.name?.toLowerCase().includes('tdn') || n.name?.toLowerCase().includes('total digestible'))?.nutrient_id;
  const idCP = nutrientsPayload.find(n => n.name?.toLowerCase().includes('crude protein') || n.name?.toLowerCase() === 'cp')?.nutrient_id;

  // 2. Extract the 5 core features from your nested nutrients array
  const formattedIngredients = ingredientsData.map(ing => {
    let dm = 0, ca = 0, p = 0, tdn = 0, cp = 0;

    if (Array.isArray(ing.nutrients)) {
      ing.nutrients.forEach(n => {
        // Grab the ID string from the database ingredient
        const nutrientId = n.nutrient?.toString();
        const val = n.value || 0;

        // Match the database ID against the IDs we found in the payload
        if (nutrientId && nutrientId === idDM) dm = val;
        else if (nutrientId && nutrientId === idCa) ca = val;
        else if (nutrientId && nutrientId === idP) p = val;
        else if (nutrientId && nutrientId === idTDN) tdn = val;
        else if (nutrientId && nutrientId === idCP) cp = val;
      });
    }

    return {
      ingredient_id: ing._id?.toString() || ing.ingredient_id?.toString(),
      name: ing.name,
      price: ing.price || 0,
      group: ing.group || 'Uncategorized',
      rawFeatures: [dm, ca, p, tdn, cp]
    };
  });

  // 3. Scale the data (Z-Score Normalization)
  const featuresCount = 5; // [dm, ca, p, tdn, cp]
  const stats = [];

  for (let col = 0; col < featuresCount; col++) {
    const values = formattedIngredients.map(ing => ing.rawFeatures[col]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    stats.push({ mean, stdDev });
  }

  const scaledDataMatrix = formattedIngredients.map(ing => {
    const scaledRow = ing.rawFeatures.map((val, col) => {
      if (stats[col].stdDev === 0) return 0; 
      return (val - stats[col].mean) / stats[col].stdDev;
    });
    ing.scaledFeatures = scaledRow; 
    return scaledRow;
  });

  return { formattedIngredients, scaledDataMatrix };
}

// --- HELPER: CALCULATE EUCLIDEAN DISTANCE ---
const calculateDistance = (point1, point2) => {
  return Math.sqrt(point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0));
}

// --- MAIN CONTROLLER ---
const suggestSubstitute = async (req, res) => {
  // Destructure 'nutrients' from the incoming request body
  const { userId, targetIngredientId, nutrients } = req.body;
    
  if (!targetIngredientId) {
    return res.status(400).json({ status: 'Error', message: 'targetIngredientId is required.' });
  }

  // Make sure the frontend actually sent the nutrients array
  if (!nutrients || !Array.isArray(nutrients)) {
    return res.status(400).json({ status: 'Error', message: 'nutrients payload is required.' });
  }

  try {
    // 1. Pass the nutrients payload to the formatter
    const { formattedIngredients, scaledDataMatrix } = await formatKMeansInput(userId, nutrients);

    if (formattedIngredients.length < 2) {
      return res.status(400).json({ status: 'Error', message: 'Not enough ingredients in the database to find substitutes.' });
    }

    // 2. Dynamically set K (Number of clusters)
    // We cap it at 5 clusters, or fewer if the user has a very small database
    const k = Math.min(5, Math.floor(formattedIngredients.length / 3)) || 2;

    // 3. Run K-Means Clustering
    const kmeansResult = kmeans(scaledDataMatrix, k, { initialization: 'kmeans++' });

    // 4. Map the Cluster IDs back to our ingredients
    formattedIngredients.forEach((ing, index) => {
      ing.clusterId = kmeansResult.clusters[index];
    });

    // 5. Find the Target Ingredient
    const targetIngredient = formattedIngredients.find(ing => ing.ingredient_id === targetIngredientId);

    if (!targetIngredient) {
      return res.status(404).json({ status: 'Error', message: 'Target ingredient not found in database.' });
    }

    // 6. Filter pool for candidates in the SAME cluster (excluding the target itself)
    const candidates = formattedIngredients.filter(ing => 
      ing.clusterId === targetIngredient.clusterId && 
      ing.ingredient_id !== targetIngredient.ingredient_id
    );

    if (candidates.length === 0) {
      return res.status(200).json({ 
        status: 'Success', 
        message: 'No suitable substitutes found in the same nutritional cluster.',
        target: targetIngredient.name,
        substitutes: [] 
      });
    }

    // 7. Calculate distances and sort by closest match
    const rankedSubstitutes = candidates.map(candidate => {
      const distance = calculateDistance(targetIngredient.scaledFeatures, candidate.scaledFeatures);
      
      // Convert the abstract mathematical distance into a friendly "Match %" (Optional but great for UI)
      // Assuming a max reasonable distance of 5 for normalization purposes
      const matchScore = Math.max(0, 100 - (distance * 20)); 

      return {
        ingredient_id: candidate.ingredient_id,
        name: candidate.name,
        group: candidate.group,
        price: candidate.price,
        distance: Number(distance.toFixed(4)),
        matchPercentage: Number(matchScore.toFixed(2)),
        // Send back raw features so the frontend can show what the values actually are
        nutrients: {
          dm: candidate.rawFeatures[0],
          ca: candidate.rawFeatures[1],
          p: candidate.rawFeatures[2],
          tdn: candidate.rawFeatures[3],
          cp: candidate.rawFeatures[4]
        }
      };
    });

    // Sort ascending by distance (lower distance = closer match)
    rankedSubstitutes.sort((a, b) => a.distance - b.distance);

    console.log("=======================================DEBUG HERE=======================================");
    console.log(`Target: ${targetIngredient.name} (Cluster ${targetIngredient.clusterId})`);
    console.log(`Top Match: ${rankedSubstitutes[0].name} (Distance: ${rankedSubstitutes[0].distance})`);

    // 8. Return response mimicking your simplex return style
    return res.status(200).json({
      status: 'Optimal substitutes found',
      targetIngredient: {
        ingredient_id: targetIngredient.ingredient_id,
        name: targetIngredient.name,
        group: targetIngredient.group,
        nutrients: {
          dm: targetIngredient.rawFeatures[0],
          ca: targetIngredient.rawFeatures[1],
          p: targetIngredient.rawFeatures[2],
          tdn: targetIngredient.rawFeatures[3],
          cp: targetIngredient.rawFeatures[4]
        }
      },
      substitutes: rankedSubstitutes.slice(0, 5) // Return only top 5 matches
    });

  } catch (error) {
    console.error("Error in Substitute optimization:", error);
    res.status(500).json({ error: "An error occurred during K-Means clustering." });
  }
}

export { suggestSubstitute };