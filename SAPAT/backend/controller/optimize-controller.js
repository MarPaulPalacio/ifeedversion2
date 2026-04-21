import GLPK from 'glpk.js';
import { getAllIngredients } from './ingredient-controller.js';

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


// Helper: Map ingredient group to constraint group
const mapGroup = (ingredientGroup) => {
  if (ingredientGroup === 'Grass' || ingredientGroup === 'Legumes') {
    return 'forage';
  }
  if (ingredientGroup === 'Industrial by-products' || ingredientGroup === 'Agricultural by-products') {
    return 'byproduct';
  }
  if (ingredientGroup === 'Vitamin-Mineral') {
    return 'vitaminMineral';
  }
  if (ingredientGroup === 'Legumes') {
    return 'legume';
  }
  return 'other';
};

// Helper: Check if we can add from a group
const canAddFromGroup = (ingredientGroup, availableGroups) => {
  const groupKey = mapGroup(ingredientGroup);
  return availableGroups[groupKey]?.canAdd !== false;
};



// Enhanced version that considers actual maxPossible calculation
const suggestByGroupEnhanced = (nutrientGaps, ingredientsData, currentIngredients, constraints, type) => {
  const isPercentMode = type === 'percent';
  const currentIngredientIds = currentIngredients.map(ing => ing.ingredient_id.toString());

  const forageConstraint = constraints.find(c => c.name.includes("Grasses & Legumes"));
  const byproductConstraint = constraints.find(c => c.name.includes("Byproducts"));
  const forageMin = isPercentMode ? Number(forageConstraint?.bnds.lb || 60) : Number(forageConstraint?.bnds.lb || 0);
  const byproductMax = isPercentMode ? Number(byproductConstraint?.bnds.ub || 40) : Number(byproductConstraint?.bnds.ub || 100000);

  // ✅ Build a map: nutrientName -> nutrientId, from the constraints themselves
  // constraints were built from nutrients[] which has both .name and .nutrient_id
  // Each constraint.name IS the nutrient name, and its vars have coefs per selected ingredient
  // But we need to match DB nutrient subdocs by ObjectId — so build the reverse map from gaps
  // nutrientGaps[].nutrient is the name — we need the corresponding nutrient_id
  // We can get it from the constraint vars' source: constraints were built with nutrient.nutrient_id
  // The easiest approach: build a nutrientName -> Set<ObjectId string> map from ALL ingredients' nutrients
  // by cross-referencing with the constraint name

  // ✅ Step 1: Build nutrientId lookup from constraints
  // Each nutrient constraint was built using nutrient.nutrient_id as the key
  // We stored it in the constraint name = nutrient.name
  // So: constraintName === nutrientName, and the coefs were computed using nutrient_id matching
  // We need to find what nutrient_id corresponds to each nutrient name
  // Best source: the request's nutrients array isn't available here, BUT
  // we can infer from ingredientsData: find any ingredient that has a non-zero coef
  // for a given constraint, then find which nutrient sub-doc gave that coef

  // ✅ Simpler: use the nutrient constraints' vars coefs as a proxy score
  // For each unselected ingredient, score it by how much it contributes to the shortage nutrient
  // The constraint already has coefs for SELECTED ingredients — but not unselected ones
  // So we must compute coefs for unselected ingredients ourselves

  // ✅ Recover percentScale
  const dmConstraint = constraints.find(c =>
    c.name?.toLowerCase().includes("dry matter") || c.name?.toLowerCase() === "dm"
  );
  let percentScale = 1;
  if (isPercentMode && dmConstraint?.vars?.length > 0) {
    // coef = percentScale * dmDecimal → percentScale = coef / dmDecimal
    for (const v of dmConstraint.vars) {
      const ing = ingredientsData.find(i => i.name === v.name);
      if (!ing) continue;
      // Try to find DM value — stored as ObjectId ref, so find by checking all nutrients
      // DM nutrient value is typically ~0.28 range; use coef directly as dmDecimal proxy
      // Actually: for DM constraint, coef = percentScale * dmDecimal
      // We don't know dmDecimal without the nutrient_id, but we know coef
      // percentScale = dietTotalWeight/100. If dietTotalWeight ≈ dmTarget, and dmTarget is in nutrients
      // Just use: percentScale = dmConstraint lb / 100 (since lb = dmTarget grams, scale = dmTarget/100)
      percentScale = dmConstraint.bnds.lb / 100;
      break;
    }
  }

  console.log(`[suggestByGroupEnhanced] percentScale: ${percentScale}`);

  // ✅ Build nutrientName -> nutrient_id map by scanning all ingredients
  // Strategy: for each nutrient gap, find the nutrient_id by checking which ObjectId
  // appears consistently in ingredients that have high coefs for that constraint
  // Simpler: just grab the nutrient_id from the matching constraint's name
  // We know nutrientGap.nutrient === constraint.name === nutrient.name from formatInput
  // And formatInput found nutrient entries via: n.nutrient?.toString() === nutrient.nutrient_id
  // So we need to recover nutrient_id per nutrient name

  // ✅ Best approach: scan ingredientsData to find the most common nutrient ObjectId
  // that maps to each nutrient name — but we don't have names on subdocs
  // SOLUTION: use the constraint coefs to identify which ObjectId is which nutrient
  // For a given constraint (nutrient name), find a selected ingredient with non-zero coef,
  // then brute-force: which of that ingredient's nutrient ObjectIds, when used as the nutrient,
  // gives a coef close to the known coef?

  // Actually the REAL solution: just pass nutrient_ids along. But since we can't change
  // the function signature easily, here's the pragmatic fix:

  // ✅ For each nutrient name, try ALL nutrient subdoc positions and pick the one
  // whose values correlate with the constraint coefs across selected ingredients
  const buildNutrientIdMap = () => {
  const map = {};

  nutrientGaps.forEach(gap => {
    const nutrientName = gap.nutrient;
    const matchingConstraint = constraints.find(c => c.name === nutrientName);
    if (!matchingConstraint) return;

    // Find a selected ingredient with non-zero coef for this nutrient constraint
    const selectedVarWithCoef = matchingConstraint.vars.find(v => v.coef > 0);
    if (!selectedVarWithCoef) return;

    const selectedIng = ingredientsData.find(i => i.name === selectedVarWithCoef.name);
    if (!selectedIng) return;

    const knownCoef = selectedVarWithCoef.coef;

    // Get DM coef for same ingredient from DM constraint
    const dmVarCoef = dmConstraint?.vars.find(v => v.name === selectedVarWithCoef.name)?.coef || 1;

    // In absolute mode: coef = dmDecimal * rawValue → rawValue = coef / dmDecimal = coef / dmVarCoef
    // In percent mode:  coef = percentScale * dmDecimal * rawValue → rawValue = coef / (percentScale * dmVarCoef)
    // But dmVarCoef in absolute = dmDecimal, in percent = percentScale * dmDecimal
    // So in BOTH cases: rawValue = knownCoef / dmVarCoef  ✅
    const expectedRawValue = knownCoef / dmVarCoef;

    console.log(`[buildNutrientIdMap] ${nutrientName}: knownCoef=${knownCoef}, dmVarCoef=${dmVarCoef}, expectedRawValue=${expectedRawValue.toFixed(4)}`);

    // Find which nutrient ObjectId matches this rawValue
    let bestMatch = null;
    let bestDiff = Infinity;

    selectedIng.nutrients.forEach(n => {
      const diff = Math.abs((n.value || 0) - expectedRawValue);
      console.log(`  [buildNutrientIdMap] checking nutrient ${n.nutrient}: value=${n.value}, diff=${diff.toFixed(4)}`);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = n.nutrient?.toString();
      }
    });

    // ✅ Relaxed threshold from 0.05 to 0.15 to handle rounding
    if (bestMatch && bestDiff < 0.15) {
      map[nutrientName] = bestMatch;
      console.log(`[buildNutrientIdMap] ✅ ${nutrientName} → ${bestMatch} (diff: ${bestDiff.toFixed(4)})`);
    } else {
      console.log(`[buildNutrientIdMap] ❌ ${nutrientName} → no match (bestDiff: ${bestDiff?.toFixed(4)})`);
    }
  });

  return map;
};

  const nutrientIdMap = buildNutrientIdMap();
  console.log('[suggestByGroupEnhanced] nutrientIdMap:', nutrientIdMap);

  const suggestions = [];

  nutrientGaps.forEach(gap => {
    const nutrientName = gap.nutrient;
    const nutrientId = nutrientIdMap[nutrientName];

    console.log(`\n🔍 [Suggestions] Processing ${nutrientName} (id: ${nutrientId})...`);

    const thresholds = {
      'Total Digestible Nutrients': { forage: 0.45, byproduct: 0.60, minimum: 0.30 },
      'Crude Protein':              { forage: 0.08, byproduct: 0.15, minimum: 0.05 },
      'Calcium':                    { forage: 0.005, byproduct: 0.01, minimum: 0.002 },
      'Phosphorous':                { forage: 0.002, byproduct: 0.005, minimum: 0.001 },
      'Dry Matter':                 { forage: 0.20, byproduct: 0.80, minimum: 0.10 }
    };
    const nutrientThreshold = thresholds[nutrientName] || { forage: 0.10, byproduct: 0.15, minimum: 0.03 };

    // ✅ Score all unselected ingredients using nutrient_id lookup
    const allCandidates = ingredientsData
      .filter(ing => !currentIngredientIds.includes(ing._id.toString()))
      .map(ing => {
        // Get DM via DM constraint var coef if this ingredient is selected,
        // otherwise find DM nutrient by checking which subdoc has value in 0.1–1.0 range
        // and is the DM nutrient (we know DM nutrient_id from dmConstraint)
        // Replace the dmNutrientId IIFE inside allCandidates .map() with this:
        
        const dmNutrientId = (() => {
          if (dmConstraint?.vars?.length > 0) {
            const sel = dmConstraint.vars.find(v => v.coef > 0);
            if (sel) {
              const selIng = ingredientsData.find(i => i.name === sel.name);
              if (selIng) {
                // In absolute mode: dmVarCoef = dmDecimal directly
                // In percent mode:  dmVarCoef = percentScale * dmDecimal
                // Either way, dmDecimal = dmVarCoef / percentScale
                const dmDecimalExpected = sel.coef / percentScale;
                let bestId = null, bestDiff = Infinity;
                selIng.nutrients.forEach(n => {
                  const diff = Math.abs((n.value || 0) - dmDecimalExpected);
                  if (diff < bestDiff) { bestDiff = diff; bestId = n.nutrient?.toString(); }
                });
                console.log(`  [dmNutrientId] expected=${dmDecimalExpected.toFixed(4)}, bestDiff=${bestDiff.toFixed(4)}, id=${bestId}`);
                return bestDiff < 0.15 ? bestId : null;
              }
            }
          }
          return null;
        })();

        const dmEntry = dmNutrientId
          ? ing.nutrients.find(n => n.nutrient?.toString() === dmNutrientId)
          : ing.nutrients.find(n => n.name?.toLowerCase().includes('dry matter') || n.name?.toLowerCase() === 'dm');
        const dmDecimal = dmEntry?.value || 0.85; // default to 85% DM if unknown

        // ✅ Look up nutrient value by ObjectId
        const nutrientEntry = nutrientId
          ? ing.nutrients.find(n => n.nutrient?.toString() === nutrientId)
          : ing.nutrients.find(n => n.name === nutrientName); // fallback to name if id not found

        const rawValue = nutrientEntry?.value || 0;

        return {
          name: ing.name,
          group: ing.group,
          _id: ing._id,
          price: ing.price,
          nutrientContent: rawValue,
          nutrientPercentage: (rawValue * 100).toFixed(1),
          pricePerNutrient: rawValue > 0 ? (Number(ing.price) / rawValue).toFixed(2) : Infinity,
          groupCategory: mapGroup(ing.group),
        };
      });


    console.log(`  Unselected candidates: ${allCandidates.length}`);
    console.log(`  Sample:`, allCandidates.slice(0, 4).map(c => `${c.name}: ${c.nutrientPercentage}%`));
    
    // After building allCandidates:
console.log("=== SUGGESTION DEBUG ===");
console.log("nutrientIdMap:", JSON.stringify(nutrientIdMap));
console.log("percentScale:", percentScale);
console.log("currentIngredientIds:", currentIngredientIds);
console.log("Total ingredientsData:", ingredientsData.length);

nutrientGaps.forEach(gap => {
  const nutrientName = gap.nutrient;
  const nutrientId = nutrientIdMap[nutrientName];
  
  console.log(`\n--- Gap: ${nutrientName} ---`);
  console.log(`  nutrientId resolved: ${nutrientId}`);

  // Check a sample ingredient's nutrient subdocs raw
  const sampleIng = ingredientsData.find(i => !currentIngredientIds.includes(i._id.toString()));
  if (sampleIng) {
    console.log(`  Sample unselected ing: ${sampleIng.name}`);
    console.log(`  Its nutrients array:`, JSON.stringify(sampleIng.nutrients.slice(0, 3)));
  }

  const allCandidates = ingredientsData
    .filter(ing => !currentIngredientIds.includes(ing._id.toString()))
    .map(ing => {
      const nutrientEntry = nutrientId
        ? ing.nutrients.find(n => n.nutrient?.toString() === nutrientId)
        : ing.nutrients.find(n => n.name === nutrientName);
      return { name: ing.name, nutrientEntry, rawValue: nutrientEntry?.value || 0 };
    });

  console.log(`  Candidates with nutrientEntry found: ${allCandidates.filter(c => c.nutrientEntry).length} / ${allCandidates.length}`);
  console.log(`  Candidates with rawValue > 0: ${allCandidates.filter(c => c.rawValue > 0).length}`);
  console.log(`  Top 3 by rawValue:`, allCandidates.sort((a,b) => b.rawValue - a.rawValue).slice(0,3).map(c => `${c.name}: ${c.rawValue}`));
});
    // Determine strategy
    const highForages = allCandidates.filter(c =>
      (c.group === 'Grass' || c.group === 'Legumes') &&
      c.nutrientContent >= nutrientThreshold.forage
    );
    const highByproducts = allCandidates.filter(c =>
      (c.group === 'Industrial by-products' || c.group === 'Agricultural by-products') &&
      c.nutrientContent >= nutrientThreshold.byproduct
    );

    let targetGroups = [];
    let strategy = "";
    if (highForages.length > 0) { targetGroups.push('forage'); strategy = `Replace current forage with higher-${nutrientName} forage`; }
    if (highByproducts.length > 0 && byproductMax > 0) { targetGroups.push('byproduct'); strategy += (strategy ? " OR " : "") + `Add high-${nutrientName} byproducts (up to ${byproductMax}%)`; }
    if (targetGroups.length === 0) strategy = `Add any ingredients high in ${nutrientName}`;

    // Filter and rank
    let filtered = allCandidates
      .filter(c => {
        if (targetGroups.length > 0 && !targetGroups.includes(c.groupCategory)) return false;
        return c.nutrientContent >= nutrientThreshold.minimum;
      })
      .sort((a, b) => b.nutrientContent - a.nutrientContent)
      .slice(0, 5);

    // Fallback: no group filter, no threshold
    if (filtered.length === 0) {
      console.log(`  ⚠️ Fallback: relaxing all filters...`);
      filtered = allCandidates
        .filter(c => c.nutrientContent > 0)
        .sort((a, b) => b.nutrientContent - a.nutrientContent)
        .slice(0, 5);
    }

    console.log(`  Final (${filtered.length}):`, filtered.map(f => `${f.name} ${f.nutrientPercentage}%`));

    if (filtered.length > 0) {
      suggestions.push({
        nutrient: nutrientName,
        shortage: gap.shortage,
        required: gap.required,
        maxPossible: gap.maxPossible,
        strategy,
        recommended: filtered.map(c => ({
          name: c.name,
          group: c.group,
          nutrientContent: c.nutrientContent,
          nutrientPercentage: c.nutrientPercentage,
          price: c.price,
          pricePerNutrient: c.pricePerNutrient,
          groupCategory: c.groupCategory,
          reason: `${c.nutrientPercentage}% ${nutrientName} • ${c.group}`
        }))
      });
    }
  });

  console.log(`\n✅ [Suggestions] Total: ${suggestions.length}`);
  return suggestions;
};

const suggestIngredients = (nutrientGaps, ingredientsData, currentIngredients) => {
  const suggestions = [];
  
  // Get ingredient IDs already in the formulation
  const currentIngredientIds = currentIngredients.map(ing => ing.ingredient_id.toString());
  
  // For each nutrient shortage
  nutrientGaps.forEach(gap => {
    const nutrientName = gap.nutrient;
    
    // Find ingredients HIGH in this nutrient that are NOT already selected
    const goodSources = ingredientsData
      .filter(ing => {
        // Skip if already in formulation
        if (currentIngredientIds.includes(ing._id.toString())) return false;
        
        // Find this nutrient in the ingredient
        const nutrientEntry = ing.nutrients.find(n => n.name === nutrientName);
        if (!nutrientEntry) return false;
        
        // Get DM-adjusted nutrient content
        const dmEntry = ing.nutrients.find(n => n.name === 'Dry Matter' || n.name === 'DM');
        const dmDecimal = dmEntry?.value || 1.0;
        const nutrientContent = dmDecimal * nutrientEntry.value; // fraction
        
        // Consider "high" if above certain threshold
        // Adjust thresholds based on your nutrient ranges
        const thresholds = {
          'Total Digestible Nutrients': 0.50,  // 50% TDN
          'Crude Protein': 0.15,               // 15% CP
          'Calcium': 0.01,                      // 1% Ca
          'Phosphorous': 0.005                  // 0.5% P
        };
        
        return nutrientContent >= (thresholds[nutrientName] || 0.1);
      })
      .sort((a, b) => {
        // Sort by nutrient content (highest first)
        const aNutrient = a.nutrients.find(n => n.name === nutrientName);
        const bNutrient = b.nutrients.find(n => n.name === nutrientName);
        
        const aDM = a.nutrients.find(n => n.name === 'Dry Matter')?.value || 1.0;
        const bDM = b.nutrients.find(n => n.name === 'Dry Matter')?.value || 1.0;
        
        const aContent = aDM * (aNutrient?.value || 0);
        const bContent = bDM * (bNutrient?.value || 0);
        
        return bContent - aContent;
      })
      .slice(0, 3); // Top 3 suggestions per nutrient
    
    if (goodSources.length > 0) {
      suggestions.push({
        nutrient: nutrientName,
        shortage: gap.shortage,
        recommended: goodSources.map(ing => ({
          name: ing.name,
          group: ing.group,
          nutrientContent: (ing.nutrients.find(n => n.name === 'Dry Matter')?.value || 1.0) * 
                          (ing.nutrients.find(n => n.name === nutrientName)?.value || 0),
          price: ing.price,
          reason: `High in ${nutrientName}`
        }))
      });
    }
  });
  
  return suggestions;
};

/**
 * Smart structural diagnosis - FULL GROUP-AWARE VERSION
 * Now properly respects all group constraints when checking feasibility
 */
const smartDiagnosis = (constraints, variableBounds, type) => {
  const issues = [];
  const isPercentMode = type === 'percent';

  console.log("🔍 [SmartDiagnosis] Starting diagnosis...");

  // Individual bounds
  variableBounds.forEach(vb => {
    if (Number(vb.lb) > Number(vb.ub) + 0.01) {
      issues.push({
        type: 'variable_bound',
        severity: 'critical',
        message: `Ingredient "${vb.name}" has min (${vb.lb}) > max (${vb.ub}).`,
        recommendation: `Set minimum ≤ maximum for ${vb.name}.`
      });
    }
  });

  // Overall percent check
  if (isPercentMode) {
    const sumMin = variableBounds.reduce((sum, vb) => sum + Number(vb.lb || 0), 0);
    if (sumMin > 100.01) {
      issues.push({
        type: 'overall_bounds',
        severity: 'critical',
        message: `Sum of minimum % (${sumMin.toFixed(1)}%) > 100%.`,
        recommendation: `Lower some ingredient minimums.`
      });
    }
  }

  console.log(`🔍 [SmartDiagnosis] Finished - Found ${issues.length} issue(s)`);
  return issues;
};

const diagnoseNutrientShortages = (constraints, ingredientsData, selectedIngredients, type, percentScale = 1, dmTarget) => {
  const gaps = [];
  const isPercentMode = type === 'percent';

  const nutrientConstraints = constraints.filter(c =>
    !c.name.includes("Group:") &&
    !c.name.includes("Total Mixture") &&
    !c.name.includes("Ratio:")
  );

  const forageConstraint = constraints.find(c => c.name.includes("Grasses & Legumes"));
  const byproductConstraint = constraints.find(c => c.name.includes("Byproducts"));

  const forageMin = Number(forageConstraint?.bnds.lb || (isPercentMode ? 60 : 0));
  const byproductMax = Number(byproductConstraint?.bnds.ub || (isPercentMode ? 40 : 100000));

  // ✅ Identify DM nutrient ID from the DM constraint's coefs
  const dmConstraint = constraints.find(c =>
    c.name?.toLowerCase().includes("dry matter") || c.name?.toLowerCase() === "dm"
  );

  nutrientConstraints.forEach(constraint => {
    if (!constraint.bnds?.lb || constraint.bnds.lb <= 0) return;
    const lb = constraint.bnds.lb;

    // ✅ Build coef for ALL ingredients in ingredientsData, not just selected ones
    // We need: dmDecimal and nutrientRawValue per ingredient
    // Strategy: recover nutrient_id by matching coefs of selected ingredients (same as buildNutrientIdMap)

    // Step 1: find nutrient_id for this constraint by cross-referencing a selected ingredient
    let nutrientId = null;
    if (dmConstraint) {
      const selVar = constraint.vars.find(v => v.coef > 0);
      if (selVar) {
        const selIng = ingredientsData.find(i => i.name === selVar.name);
        const dmVar = dmConstraint.vars.find(v => v.name === selVar.name);
        if (selIng && dmVar) {
          // coef = dmDecimal * rawValue  →  rawValue = coef / dmDecimal
          // dmVar.coef = dmDecimal (in percent mode, no percentScale in coef)
          const dmDecimal = dmVar.coef; // already dmDecimal in percent mode
          const expectedRaw = selVar.coef / dmDecimal;
          let bestDiff = Infinity;
          selIng.nutrients.forEach(n => {
            const diff = Math.abs((n.value || 0) - expectedRaw);
            if (diff < bestDiff) { bestDiff = diff; nutrientId = n.nutrient?.toString(); }
          });
          if (bestDiff >= 0.15) nutrientId = null;
        }
      }
    }

    const scalingFactor = isPercentMode ? (dmTarget / 100) : 1.0;

    // Step 2: compute coef for ALL ingredients using recovered nutrient_id
    const allIngCoefs = ingredientsData.map(ing => {
      const dmEntry = dmConstraint
        ? (() => {
            // Try to get DM value same way as formatInput
            const dmVar = dmConstraint.vars.find(v => v.name === ing.name);
            if (dmVar) return { value: dmVar.coef }; // already dmDecimal for selected ings
            // For unselected: find DM nutrient by nutrient_id match or fallback
            const dmNutrientId = (() => {
              const dmSelVar = dmConstraint.vars.find(v => v.coef > 0);
              if (!dmSelVar) return null;
              const dmSelIng = ingredientsData.find(i => i.name === dmSelVar.name);
              if (!dmSelIng) return null;
              // dmVar.coef = dmDecimal, find which nutrient subdoc matches
              let bestId = null, bestDiff = Infinity;
              dmSelIng.nutrients.forEach(n => {
                const diff = Math.abs((n.value || 0) - dmSelVar.coef);
                if (diff < bestDiff) { bestDiff = diff; bestId = n.nutrient?.toString(); }
              });
              return bestDiff < 0.15 ? bestId : null;
            })();
            if (dmNutrientId) {
              return ing.nutrients.find(n => n.nutrient?.toString() === dmNutrientId);
            }
            return ing.nutrients.find(n => n.name?.toLowerCase().includes('dry matter'));
          })()
        : ing.nutrients.find(n => n.name?.toLowerCase().includes('dry matter'));

      const dmDecimal = dmEntry?.value || 0.85;

      const nutrientEntry = nutrientId
        ? ing.nutrients.find(n => n.nutrient?.toString() === nutrientId)
        : ing.nutrients.find(n => n.name === constraint.name);
      const rawValue = nutrientEntry?.value || 0;

      const coef = (dmDecimal * rawValue) * scalingFactor; // grams per 1% (same formula as formatInput)

      return {
        name: ing.name,
        group: ing.group,
        coef,
      };
    });

    let maxPossible = 0;

    if (isPercentMode) {
      let allocated = 0;

      // 1. Min forage (60%)
      const bestForage = constraint.vars
        .filter(v => {
          const d = ingredientsData.find(i => i.name === v.name);
          return d && (d.group === 'Grass' || d.group === 'Legumes');
        })
        .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];

      if (bestForage && forageMin > 0) {
        maxPossible += bestForage.coef * forageMin * percentScale; // ✅ × percentScale
        allocated += forageMin;
      }

      // 2. Max byproducts (up to 40%)
      const bpAlloc = Math.min(byproductMax, 100 - allocated);
      if (bpAlloc > 0) {
        const bestBP = constraint.vars
          .filter(v => {
            const d = ingredientsData.find(i => i.name === v.name);
            return d && (d.group === 'Industrial by-products' || d.group === 'Agricultural by-products');
          })
          .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];

        if (bestBP) {
          maxPossible += bestBP.coef * bpAlloc * percentScale; // ✅ × percentScale
          allocated += bpAlloc;
        }
      }

      // 3. Remaining to best ingredient
      const remaining = 100 - allocated;
      if (remaining > 0) {
        const best = constraint.vars
          .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];
        if (best) {
          maxPossible += best.coef * remaining * percentScale; // ✅ × percentScale
        }
      }

    } else {
      // gram mode stays the same but also uses allIngCoefs
      let allocatedDM = 0;

      const bestForage = allIngCoefs
        .filter(c => c.group === 'Grass' || c.group === 'Legumes')
        .sort((a, b) => b.coef - a.coef)[0];

      if (bestForage && forageMin > 0) {
        maxPossible += bestForage.coef * forageMin;
        allocatedDM += forageMin;
      }

      const bpAlloc = Math.min(byproductMax, dmTarget - allocatedDM);
      if (bpAlloc > 0) {
        const bestBP = allIngCoefs
          .filter(c => c.group === 'Industrial by-products' || c.group === 'Agricultural by-products')
          .sort((a, b) => b.coef - a.coef)[0];
        if (bestBP) {
          maxPossible += bestBP.coef * bpAlloc;
          allocatedDM += bpAlloc;
        }
      }

      const remainingDM = dmTarget - allocatedDM;
      if (remainingDM > 0) {
        const bestOther = allIngCoefs
          .filter(c => c.group !== 'Vitamin-Mineral')
          .sort((a, b) => b.coef - a.coef)[0];
        if (bestOther) maxPossible += bestOther.coef * remainingDM;
      }
    }
    
    if (lb > 0 && maxPossible < lb * 0.99) {
      gaps.push({
        type: 'shortage',
        severity: 'high',
        nutrient: constraint.name,
        required: Number(lb.toFixed(1)),
        maxPossible: Number(maxPossible.toFixed(1)),
        shortage: Number((lb - maxPossible).toFixed(1)),
        message: `${constraint.name} cannot be met. Need ${lb.toFixed(0)} but realistic max is ${maxPossible.toFixed(0)}.`,
        recommendation: `Reduce forage minimum or add more high-${constraint.name} ingredients.`
      });
    }
  });

  return gaps;
};

const formatInput = async (data) => {
  const { userId, ingredients, nutrients, weight, type, nutrientRatioConstraints = [] } = data;
  console.log("RAW NUTRIENTS FROM REQUEST:", JSON.stringify(nutrients, null, 2));
 
  const rawType = type || '';
  const normalizedType = String(rawType).toLowerCase().trim();
  const isPercentMode = normalizedType === 'percent';
 
  console.log(`🚨 [formatInput] Received type: "${type}" → normalizedType: "${normalizedType}" → isPercentMode: ${isPercentMode}`);
  
  const ingredientsData = await fetchIngredientsData(userId);
  
  // === IDENTIFY DM NUTRIENT ===
  const dmNutrientId = nutrients.find(n => 
    n.name?.toLowerCase().includes("dry matter") || n.name?.toLowerCase() === "dm"
  )?.nutrient_id;
 
  const dmTarget = nutrients.find(n => 
    n.name?.toLowerCase().includes("dry matter") || n.name?.toLowerCase() === "dm"
  )?.minimum || weight;
 
  console.log("DM Nutrient ID:", dmNutrientId);
  console.log("DM Target (grams):", dmTarget);
 
  // === OBJECTIVE FUNCTION (minimize cost) ===
  const objectives = ingredients.map(ingredient => {
    const coef = ingredientsData.find(item => 
      (item._id?.toString() === ingredient.ingredient_id) || 
      (item.ingredient_id?.toString() === ingredient.ingredient_id)
    ).price;
 
    return {
      name: ingredient.name,
      coef: coef
    }
  });
 
  // === NUTRIENT CONSTRAINTS (OPTION B: NO percentScale multiplier) ===
  // KEY: Coefficients directly represent grams per 1% of ingredient
  // This works because variables ARE percentages (sum to 100%)
 
  const constraints = nutrients
    // Skip the DM constraint in percent mode (it is redundant on DM basis)
    .filter(nutrient => {
      if (!isPercentMode) return true;
      const name = nutrient.name?.toLowerCase();
      return !(name.includes("dry matter") || name === "dm");
    })
    .map(nutrient => {
      const bndType = nutrient.maximum ? "GLP_DB" : "GLP_LO";
      const isDM = nutrient.nutrient_id === dmNutrientId || 
                   nutrient.name?.toLowerCase().includes("dry matter") || 
                   nutrient.name?.toLowerCase() === "dm";

      return {
        name: nutrient.name,
        unit: nutrient.unit,
        vars: ingredients.map(ingredient => {
          const ingData = ingredientsData.find(item => 
            (item._id?.toString() === ingredient.ingredient_id) || 
            (item.ingredient_id?.toString() === ingredient.ingredient_id)
          );

          const dmEntry = ingData?.nutrients.find(n => 
            n.nutrient?.toString() === dmNutrientId?.toString()
          );
          const dmDecimal = dmEntry?.value || 1.0;

          const nutrientEntry = ingData.nutrients.find(n => 
            (n.nutrient?.toString() === nutrient.nutrient_id) || (n.name === nutrient.name)
          );
          const rawValue = nutrientEntry?.value || 0;

          let finalCoef;
          if (isPercentMode) {
            // === PERCENT MODE = DM-BASIS FORMULATION ===
            finalCoef = rawValue;          // nutrient fraction on DM basis
          } else {
            // gram mode (as-fed grams)
            finalCoef = isDM ? dmDecimal : dmDecimal * rawValue;
          }

          return { name: ingredient.name, coef: finalCoef };
        }),

        bnds: {
          type: bndType,
          lb: isPercentMode 
            ? (Number(nutrient.minimum) / dmTarget) * 100   // convert grams → % of DM
            : (Number(nutrient.minimum) || 0),
          ub: nutrient.maximum 
            ? (isPercentMode 
                ? (Number(nutrient.maximum) / dmTarget) * 100 
                : Number(nutrient.maximum))
            : undefined
        }
      };
    });
  console.log(`MODE: ${isPercentMode ? 'PERCENT' : 'GRAM'}`);
  console.log(`DM Target (lb): ${dmTarget}`);
  constraints
    .filter(c => c.name.toLowerCase().includes('dry matter') || c.name.toLowerCase() === 'dm')
    .forEach(c => {
      const maxLHS = c.vars.reduce((sum, v) => sum + v.coef, 0) * 100; // max possible in percent mode
      console.log(`DM constraint max possible LHS in percent mode ≈ ${maxLHS.toFixed(1)} vs required ${dmTarget}`);
    });
 
  console.log("=== NUTRIENT COEFFICIENT CHECK (grams per 1% of diet) ===");
  constraints
    .filter(c => !c.name.includes("Group") && !c.name.includes("Total Mixture"))
    .forEach(c => {
      const sumCoef = c.vars.reduce((sum, v) => sum + v.coef, 0);
      console.log(`${c.name.padEnd(25)} → ${sumCoef.toFixed(4)} g per 1%  (at 100% diet = ${(sumCoef * 100).toFixed(1)} g)`);
    });
 
  // === GROUP DEFINITIONS ===
  const forageIngredients = ingredients.filter(ing => {
    const data = ingredientsData.find(d => d._id.toString() === ing.ingredient_id.toString());
    return data.group === 'Grass' || data.group === 'Legumes';
  });
 
  const legumeIngredients = ingredients.filter(ing => {
    const data = ingredientsData.find(d => d._id.toString() === ing.ingredient_id.toString());
    return data.group === 'Legumes';
  });
 
  const byproductIngredients = ingredients.filter(ing => {
    const data = ingredientsData.find(d => d._id.toString() === ing.ingredient_id.toString());
    return data.group === 'Agricultural by-products' || data.group === 'Industrial by-products';
  });
 
  const vitaminmineral = ingredients.filter(ing => {
    const data = ingredientsData.find(d => d._id.toString() === ing.ingredient_id.toString());
    return data.group === 'Vitamin-Mineral';
  });
 
  console.log("Forage Ingredients:", forageIngredients.map(f => f.name));
  console.log("Byproduct Ingredients:", byproductIngredients.map(b => b.name));
  console.log("Vitamin-Mineral Ingredients:", vitaminmineral.map(v => v.name));
 
  // === GROUP CONSTRAINTS (Pure percentages in percent mode) ===
  if (isPercentMode) {
    constraints.push({
      name: "Group: Grasses & Legumes (60-100%)",
      vars: ingredients.map(ing => {
        const isForage = forageIngredients.some(f => f.name === ing.name);
        return { name: ing.name, coef: isForage ? 1 : 0 };
      }),
      bnds: {
        type: "GLP_DB",
        lb: 60,
        ub: 100
      }
    });
 
    constraints.push({
      name: "Group: Byproducts (0-40%)",
      vars: ingredients.map(ing => {
        const isByproduct = byproductIngredients.some(b => b.name === ing.name);
        return { name: ing.name, coef: isByproduct ? 1 : 0 };
      }),
      bnds: {
        type: "GLP_UP",
        lb: 0,
        ub: 40
      }
    });
 
    constraints.push({
      name: "Group: Vitamin-Mineral (0-3%)",
      vars: ingredients.map(ing => {
        const isVM = vitaminmineral.some(v => v.name === ing.name);
        return { name: ing.name, coef: isVM ? 1 : 0 };
      }),
      bnds: {
        type: "GLP_UP",
        lb: 0,
        ub: 3
      }
    });
 
    constraints.push({
      name: "Group: Legumes Constraint",
      vars: ingredients.map(ing => {
        const isLegume = legumeIngredients.some(l => l.name === ing.name);
        return { name: ing.name, coef: isLegume ? 1 : 0 };
      }),
      bnds: {
        type: "GLP_UP",
        lb: 0,
        ub: 20
      }
    });
 
    constraints.push({
      name: "Total Mixture Weight (Percent Mode)",
      vars: ingredients.map(ing => ({ name: ing.name, coef: 1 })),
      bnds: {
        type: "GLP_FX",
        lb: 100,
        ub: 100
      }
    });
  } else {
    // GRAM MODE: DM-weighted group constraints
    constraints.push({
      name: "Group: Grasses & Legumes (60-100% of DM)",
      vars: ingredients.map(ing => {
        const isForage = forageIngredients.some(f => f.name === ing.name);
        if (!isForage) return { name: ing.name, coef: 0 };
        
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        return { name: ing.name, coef: dmDecimal };
      }),
      bnds: {
        type: "GLP_DB",
        lb: dmTarget * 0.60,
        ub: dmTarget
      }
    });
 
    constraints.push({
      name: "Group: Byproducts (0-40% of DM)",
      vars: ingredients.map(ing => {
        const isByproduct = byproductIngredients.some(b => b.name === ing.name);
        if (!isByproduct) return { name: ing.name, coef: 0 };
        
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        return { name: ing.name, coef: dmDecimal };
      }),
      bnds: {
        type: "GLP_UP",
        lb: 0,
        ub: dmTarget * 0.40
      }
    });
 
    constraints.push({
      name: "Group: Vitamin-Mineral (0-3% of DM)",
      vars: ingredients.map(ing => {
        const isVM = vitaminmineral.some(v => v.name === ing.name);
        if (!isVM) return { name: ing.name, coef: 0 };
        
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        return { name: ing.name, coef: dmDecimal };
      }),
      bnds: {
        type: "GLP_UP",
        lb: 0,
        ub: dmTarget * 0.03
      }
    });
 
    constraints.push({
      name: "Group: Legumes Constraint",
      vars: ingredients.map(ing => {
        const isLegume = legumeIngredients.some(l => l.name === ing.name);
        if (!isLegume) return { name: ing.name, coef: 0 };
        
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        return { name: ing.name, coef: dmDecimal };
      }),
      bnds: {
        type: "GLP_UP",
        lb: 0,
        ub: dmTarget * 0.20
      }
    });
  }
 
  // === NUTRIENT RATIO CONSTRAINTS ===
  for (const ratio of nutrientRatioConstraints) {
    const firstNutrientId = ratio.firstIngredientId || ratio.firstIngredient;
    const secondNutrientId = ratio.secondIngredientId || ratio.secondIngredient;
    const firstNutrientName = ratio.firstIngredient;
    const secondNutrientName = ratio.secondIngredient;
    const { operator, firstIngredientRatio, secondIngredientRatio } = ratio;
    
    if (!firstNutrientId || !secondNutrientId || !operator || !firstIngredientRatio || !secondIngredientRatio) continue;
    
    const ratioValue = firstIngredientRatio / secondIngredientRatio;
 
    const vars = ingredients.map(ingredient => {
      const ingData = ingredientsData.find(item => item.name === ingredient.name);
      let n1 = 0, n2 = 0;
 
      if (ingData && Array.isArray(ingData.nutrients)) {
        const dmEntry = ingData.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
 
        const isFirst = (ingData._id?.toString() === firstNutrientId) || (ingData.name === firstNutrientName);
        const isSecond = (ingData._id?.toString() === secondNutrientId) || (ingData.name === secondNutrientName);
 
        n1 = isFirst ? dmDecimal : 0;
        n2 = isSecond ? dmDecimal : 0;
      }
 
      return {
        name: ingredient.name,
        coef: n1 - (ratioValue * n2)
      };
    });
 
    console.log(`[Nutrient Ratio Constraint] ${firstNutrientName || firstNutrientId} / ${secondNutrientName || secondNutrientId} ${operator} ${ratioValue}`);
    
    if (vars.every(v => v.coef === 0)) {
      console.warn(`[Nutrient Ratio Constraint] Skipping because all coefficients are zero.`);
      continue;
    }
 
    let bnds;
    if (operator === "=") {
      bnds = { type: "GLP_FX", lb: 0, ub: 0 };
    } else if (operator === ">=") {
      bnds = { type: "GLP_LO", lb: 0, ub: null };
    } else if (operator === "<=") {
      bnds = { type: "GLP_UP", lb: null, ub: 0 };
    } else {
      continue;
    }
 
    constraints.push({
      name: `Ratio: ${firstNutrientName || firstNutrientId}/${secondNutrientName || secondNutrientId} ${operator} ${ratioValue}`,
      vars,
      bnds
    });
  }
 
  // === INGREDIENT VARIABLE BOUNDS ===
  const variableBounds = ingredients.map(ingredient => {
    const bndType = ingredient.maximum ? "GLP_DB" : "GLP_LO";
    let lb = Number(ingredient.minimum) || 0;
    let ub = Number(ingredient.maximum) || (isPercentMode ? 100 : (weight || 100000));
 
    return {
      name: ingredient.name,
      type: bndType,
      lb: lb,
      ub: ub
    };
  });
 
  console.log("\n=== FINAL SOLVER CHECK ===");
  console.log("Mode:", isPercentMode ? "PERCENT (variables sum to 100%)" : "GRAM");
  console.log("DM Target:", dmTarget, "grams");
  console.log("First 3 Nutrient Constraints:", constraints.slice(0, 3).map(c => ({name: c.name, lb: c.bnds.lb, ub: c.bnds.ub})));
  console.log("Variable Bounds (First Ing):", variableBounds[0]);
 
  return { 
    objectives, 
    constraints, 
    variableBounds, 
    weight, 
    dmTarget,
    dmNutrientId,
    isPercentMode,
    ingredientsData 
  };
}


const determineOptimizedNutrients = (optimizedIngredientsArray, constraints, type, dmTarget, dmNutrientId) => {
  // Convert array to easy lookup map: name → value
  const optimizedMap = {};
  optimizedIngredientsArray.forEach(ing => {
    optimizedMap[ing.name] = ing.value;
  });

  const result = constraints.map(constraint => {
    let optimizedNutrientValue = 0;

    Object.keys(optimizedMap).forEach(ingredient => {
      const involved = constraint.vars.find(v => v.name === ingredient);
      if (!involved) return;

      const value = optimizedMap[ingredient];

      if (type === 'percent') {
        // DM-basis percent mode
        optimizedNutrientValue += (value / 100) * dmTarget * involved.coef;
      } else {
        // Gram mode
        optimizedNutrientValue += involved.coef * value;
      }
    });

    return {
      name: constraint.name,
      value: Number(optimizedNutrientValue.toFixed(2))   // grams
    };
  });

  // === ALWAYS ADD DRY MATTER (in both modes) ===
  result.push({
    name: "Dry Matter",
    value: Number(dmTarget.toFixed(2))   // exactly the target (6720 g)
  });

  // Optional: sort so DM appears at the end (or wherever you prefer)
  return result.sort((a, b) => a.name.localeCompare(b.name));
};


const computeCost = (optimizedIngredients, objectives, type, dietTotalWeight) => {
  const percentScale = type === 'percent' ? (dietTotalWeight / 100) : 1;
  let cost = 0;
  for (let i = 0; i < objectives.length; i++) {
    // value is in percent, convert to grams for cost calculation
    let ingWeight = optimizedIngredients[i].value * percentScale;
    cost += objectives[i].coef * ingWeight;
  }
  return cost;
};
const simplex = async (req, res) => {

  const { type, nutrients, userId } = req.body;
  
  const { objectives, constraints, variableBounds, dmTarget, dmNutrientId, isPercentMode, ingredientsData } = await formatInput(req.body);

  try {
    const glpk = GLPK();
    const options = {
      msglev: glpk.GLP_MSG_ALL,
      presol: true,
      cb: {
        call: progress => console.log(progress),
        each: 1
      }
    };

    const constraintsMap = {};
    const subjects = [];
    
    for (let i = 0; i < constraints.length; i++) {
      const constraintCode = 'c' + i;
      constraintsMap[constraintCode] = constraints[i].name;
      
      subjects.push({
        name: constraintCode,
        vars: constraints[i].vars,
        bnds: constraints[i].bnds
      });
      subjects[i].bnds.type = glpk[subjects[i].bnds.type];
    }

    const varsSubjects = [];
    for (let i = 0; i < variableBounds.length; i++) {
      varsSubjects.push({
        name: variableBounds[i].name,
        type: variableBounds[i].type,
        ub: variableBounds[i].ub,
        lb: variableBounds[i].lb
      });
      varsSubjects[i].type = glpk[varsSubjects[i].type];
    }

    console.log("=== PRE-SOLVE FEASIBILITY CHECK ===");
    console.log(`Mode: ${isPercentMode ? 'PERCENT' : 'GRAM'}`);
    console.log(`DM Target: ${dmTarget}g`);
    
    const output = glpk.solve({
      name: 'LP',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: objectives
      },
      subjectTo: subjects,
      bounds: varsSubjects
    }, options);

    console.log(`Solver status: ${output.result.status} (optimal is ${glpk.GLP_OPT})`);

    const isSuccessful = (output.result.status === glpk.GLP_OPT);


    // ========================= POST-SOLVE ANALYSIS =========================
    if (isSuccessful) {
      console.log("✅ Optimal solution found!");
      
      const optimizedIngredients = [];
      let totalSolved = 0;
      
      Object.entries(output.result.vars).forEach(([key, value]) => {
        optimizedIngredients.push({ name: key, value: value });
        totalSolved += value;
      });

      console.log(`Total solved: ${totalSolved.toFixed(2)}`);

      // === COMPUTE TOTAL AS-FED WEIGHT IN GRAMS (both modes) ===
      let totalWeightGrams = 0;

      if (!isPercentMode) {
        // Gram mode → variables are already grams as-fed
        totalWeightGrams = totalSolved;
      } else {
        // Percent mode (DM-basis) → convert % of DM back to as-fed grams
        Object.entries(output.result.vars).forEach(([name, percentOfDM]) => {
          if (percentOfDM < 0.001) return; // skip near-zero
          const ingData = ingredientsData.find(i => i.name === name);
          if (!ingData) return;

          const dmEntry = ingData.nutrients.find(n => 
            n.nutrient?.toString() === dmNutrientId?.toString()
          );
          const dmDecimal = dmEntry?.value || 0.90;

          const dmContributionGrams = (percentOfDM / 100) * dmTarget;
          const asFedGrams = dmContributionGrams / dmDecimal;

          totalWeightGrams += asFedGrams;
        });
      }

      console.log(`Total as-fed weight: ${totalWeightGrams.toFixed(1)} grams`);

      const optimizedNutrients = determineOptimizedNutrients(
        optimizedIngredients, 
        constraints, 
        isPercentMode ? 'percent' : 'gram', 
        dmTarget,
        dmNutrientId          // ← add this
      );

      // Cost (fixed for percent mode too)
      let finalCost = 0;
      Object.entries(output.result.vars).forEach(([ingredient, value]) => {
        const obj = objectives.find(o => o.name === ingredient);
        if (!obj) return;

        if (!isPercentMode) {
          finalCost += obj.coef * value;                    // grams × price
        } else {
          const ingData = ingredientsData.find(i => i.name === ingredient);
          const dmDecimal = ingData?.nutrients.find(n => 
            n.nutrient?.toString() === dmNutrientId?.toString()
          )?.value || 0.90;
          const dmContribution = (value / 100) * dmTarget;
          const asFedGrams = dmContribution / dmDecimal;
          finalCost += obj.coef * asFedGrams;
        }
      });

      const shadowPrices = Object.entries(output.result.dual).map(([key, value]) => ({
        constraint: constraintsMap[key] || key,
        shadowPrice: value
      }));

      res.status(200).json({
        status: 'Optimal solution found',
        constraints: constraints,
        optimizedCost: finalCost,
        optimizedIngredients: optimizedIngredients,   // still % of DM in percent mode (cleaner for UI)
        optimizedNutrients: optimizedNutrients,
        shadowPrices: shadowPrices,
        weight: totalWeightGrams                      // ✅ ALWAYS grams now (both modes)
      });
    } else {
      console.log("❌ Optimal solution NOT found. Starting diagnosis...");

      const structuralGaps = smartDiagnosis(constraints, variableBounds, isPercentMode ? 'percent' : 'gram');
      const dmConstraintForScale = constraints.find(c =>
          c.name?.toLowerCase().includes("dry matter") || c.name?.toLowerCase() === "dm"
        );
        const percentScale = (isPercentMode && dmConstraintForScale?.bnds?.lb)
          ? dmConstraintForScale.bnds.lb / 100
          : 1;
      const nutrientGaps = diagnoseNutrientShortages(
        constraints, 
        ingredientsData,
        req.body.ingredients,
        isPercentMode ? 'percent' : 'gram',
        percentScale,
        dmTarget          // ←←← added
      );

      const smartIngredientSuggestions = suggestByGroupEnhanced(
        nutrientGaps,
        ingredientsData,
        req.body.ingredients,
        constraints,
        isPercentMode ? 'percent' : 'gram'
      );

      let priorityAdvice = "Unknown infeasibility.";
      let suggestion = "Try relaxing tight constraints or adding high-nutrient ingredients.";

      if (structuralGaps.length > 0) {
        priorityAdvice = structuralGaps[0].message || "Fix ingredient min/max bounds first.";
        suggestion = structuralGaps[0].recommendation || "Adjust ingredient bounds.";
      } 
      else if (nutrientGaps.length > 0) {
        const critical = nutrientGaps[0];
        priorityAdvice = `Shortage in ${critical.nutrient}: Need ${critical.required} but realistic max is ${critical.maxPossible}.`;
        suggestion = critical.recommendation || `Add more high-${critical.nutrient} ingredients.`;
      } 
      else {
        priorityAdvice = "Complex infeasibility: conflicting group limits and nutrient requirements.";
        suggestion = "Reduce forage minimum or relax group constraints.";
      }

      console.log('nutrientGaps:', nutrientGaps);
      console.log('structuralGaps:', structuralGaps);

      res.status(400).json({
        status: 'No optimal solution',
        message: output.result.status || 'Infeasible formulation',
        structuralIssues: structuralGaps,
        nutrientIssues: nutrientGaps,
        priorityAdvice,
        suggestion,
        smartIngredientSuggestions,
      });
    }
    
  } catch (error) {
    console.error("Error in Simplex optimization:", error);
    res.status(500).json({ error: "An error occurred during Simplex optimization." });
  }
}

export { simplex };