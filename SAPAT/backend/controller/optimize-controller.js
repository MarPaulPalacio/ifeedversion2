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

/**
 * Diagnose nutrient shortages - FINAL FIXED VERSION (works for both modes)
 * Respects ALL group limits in both percent and gram mode
 */
const diagnoseNutrientShortages = (constraints, ingredientsData, selectedIngredients, type) => {
  const gaps = [];
  const isPercentMode = type === 'percent';

  const nutrientConstraints = constraints.filter(c => 
    !c.name.includes("Group:") && 
    !c.name.includes("Total Mixture") &&
    !c.name.includes("Ratio:")
  );

  // Get group limits
  const forageConstraint = constraints.find(c => c.name.includes("Grasses & Legumes"));
  const byproductConstraint = constraints.find(c => c.name.includes("Byproducts"));
  const vmConstraint = constraints.find(c => c.name.includes("Vitamin-Mineral"));

  const forageMin = isPercentMode ? 
    Number(forageConstraint?.bnds.lb || 60) : Number(forageConstraint?.bnds.lb || 0);

  const byproductMax = isPercentMode ? 
    Number(byproductConstraint?.bnds.ub || 40) : Number(byproductConstraint?.bnds.ub || 100000);

  const vmMax = isPercentMode ? 
    Number(vmConstraint?.bnds.ub || 3) : Number(vmConstraint?.bnds.ub || 100000);

  nutrientConstraints.forEach(constraint => {
    if (!constraint.bnds?.lb || constraint.bnds.lb <= 0) return;

    const lb = constraint.bnds.lb;
    let maxPossible = 0;

    if (isPercentMode) {
      let allocated = 0;

      // 1. Minimum forage
      if (forageMin > 0) {
        const bestForage = constraint.vars
          .filter(v => {
            const d = ingredientsData.find(i => i.name === v.name);
            return d && (d.group === 'Grass' || d.group === 'Legumes');
          })
          .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];

        if (bestForage) {
          // coef is already in grams per 1%, so coef * forageMin = grams
          maxPossible += bestForage.coef * forageMin;
          allocated += forageMin;
        }
      }

      // 2. Maximum byproducts
      const bpAlloc = Math.min(byproductMax, 100 - allocated);
      if (bpAlloc > 0) {
        const bestBP = constraint.vars
          .filter(v => {
            const d = ingredientsData.find(i => i.name === v.name);
            return d && (d.group === 'Industrial by-products' || d.group === 'Agricultural by-products');
          })
          .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];

        if (bestBP) {
          maxPossible += bestBP.coef * bpAlloc;
          allocated += bpAlloc;
        }
      }

      // 3. Remaining to best ingredients
      const remaining = 100 - allocated;
      if (remaining > 0) {
        const best = constraint.vars
          .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];
        if (best) {
          maxPossible += best.coef * remaining;
        }
      }

      // ✅ NO EXTRA MULTIPLICATION - maxPossible is already in grams!

    } else {
      // === GRAM MODE - RESPECT GROUP DM LIMITS ===
      const dmConstraint = constraints.find(c => c.name === 'Dry Matter');
      const totalDM = dmConstraint?.bnds.lb || 6720;

      let allocatedDM = 0;

      // 1. Minimum forage DM
      const forageDM = forageMin;
      const bestForageDM = constraint.vars
        .filter(v => {
          const d = ingredientsData.find(i => i.name === v.name);
          return d && (d.group === 'Grass' || d.group === 'Legumes');
        })
        .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];

      if (bestForageDM && forageDM > 0) {
        maxPossible += bestForageDM.coef * forageDM;
        allocatedDM += forageDM;
      }

      // 2. Maximum byproduct DM
      const byproductDM = Math.min(byproductMax, totalDM - allocatedDM);
      if (byproductDM > 0) {
        const bestBP = constraint.vars
          .filter(v => {
            const d = ingredientsData.find(i => i.name === v.name);
            return d && (d.group === 'Industrial by-products' || d.group === 'Agricultural by-products');
          })
          .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];

        if (bestBP) {
          maxPossible += bestBP.coef * byproductDM;
          allocatedDM += byproductDM;
        }
      }

      // 3. Remaining DM to best ingredient (respecting VM limit)
      const remainingDM = totalDM - allocatedDM;
      if (remainingDM > 0) {
        // Find best non-VM ingredient
        const bestNonVM = constraint.vars
          .filter(v => {
            const d = ingredientsData.find(i => i.name === v.name);
            return d && d.group !== 'Vitamin-Mineral';
          })
          .sort((a, b) => (b.coef || 0) - (a.coef || 0))[0];

        if (bestNonVM) {
          maxPossible += bestNonVM.coef * remainingDM;
        }
      }
    }

    // console.log(`[Diagnosis] ${constraint.name} | Required: ${lb.toFixed(0)} | Realistic Max (groups): ${maxPossible.toFixed(0)}`);

    if (lb > 0 && maxPossible < lb * 0.99) {
      gaps.push({
        type: 'shortage',
        severity: 'high',
        nutrient: constraint.name,
        required: Number(lb.toFixed(1)),
        maxPossible: Number(maxPossible.toFixed(1)),
        shortage: Number((lb - maxPossible).toFixed(1)),
        message: `${constraint.name} cannot be met. Need ${lb.toFixed(0)} but realistic max (respecting all groups) is only ${maxPossible.toFixed(0)}.`,
        recommendation: `Reduce forage minimum or add more high-${constraint.name} concentrates.`
      });
    }
  });

  return gaps;
};

const formatInput = async (data) => {
  // Accept nutrientRatioConstraints from the request body (default to empty array if not present)
  const { userId, ingredients, nutrients, weight, type, nutrientRatioConstraints = [] } = data;
  console.log("RAW NUTRIENTS FROM REQUEST:", JSON.stringify(nutrients, null, 2));

  const rawType = type || '';
  const normalizedType = String(rawType).toLowerCase().trim();
  const isPercentMode = normalizedType === 'percent';

  console.log(`🚨 [formatInput] Received type: "${type}" → normalizedType: "${normalizedType}" → isPercentMode: ${isPercentMode}`);
  
  const ingredientsData = await fetchIngredientsData(userId);
  
  // const dietTotalWeight = type === 'percent' ? (dmTarget / 0.28) : weight;
  // const percentScale = type === 'percent' ? (dietTotalWeight / 100) : 1;

  


  // === objective function (minimize cost) ===
  const objectives = ingredients.map(ingredient => {
    // the copy of ingredient either comes from global or user-revised
    const coef = ingredientsData.find(item => (item._id?.toString() === ingredient.ingredient_id) || (item.ingredient_id?.toString() === ingredient.ingredient_id)).price;

    return {
      name: ingredient.name,
      coef: coef
    }
  });
  // BIG CHAGNE HERE PLOT TWIST FIND ME THE CODE IS CHECKPOINT!!!!
  //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  // === nutrient constraints === (e.g. 5x1 + 10x2 + 4x3 >= 15)
  // === nutrient constraints ===
// 1. Identify which nutrient is Dry Matter first to use as a multiplier
const dmNutrientId = nutrients.find(n => 
  n.name?.toLowerCase().includes("dry matter") || n.name?.toLowerCase() === "dm"
)?.nutrient_id;

  
console.log("DM Nutrient ID:", dmNutrientId);

 const dmTarget = nutrients.find(n => 
    n.name?.toLowerCase().includes("dry matter") || n.name?.toLowerCase() === "dm"
  )?.minimum || weight;

  const assumedWeight = weight || (dmTarget * 1.5);

  // In percent mode, dmTarget (e.g. 6000g) is our gram anchor
  // percentScale = how many grams does 1% represent
 

// Map Constraints
// const dietTotalWeight = type === 'percent' ? (dmTarget / 0.28) : weight;

const dietTotalWeight = isPercentMode ? (dmTarget) : weight;

const percentScale = isPercentMode ? (dietTotalWeight / 100) : 1;

const constraints = nutrients.map(nutrient => {
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

      // DM value from DB is a FRACTION (0.28 = 28% DM)
      const dmEntry = ingData?.nutrients.find(n => 
        n.nutrient?.toString() === dmNutrientId?.toString()
      );
      const dmValue = dmEntry?.value || 1.0;     // ← FRACTION
      const dmDecimal = dmValue;                 // ← NO /100

      // Other nutrients are also stored as FRACTION (0.55 = 55%)
      const nutrientEntry = ingData.nutrients.find(n => 
        (n.nutrient?.toString() === nutrient.nutrient_id) || (n.name === nutrient.name)
      );
      const rawValue = nutrientEntry?.value || 0;   // ← FRACTION

      let finalCoef;
      if (isDM) {
        // grams of DM contributed by 1% of this ingredient
        finalCoef = percentScale * dmDecimal;
      } else {
        // grams of nutrient contributed by 1% of this ingredient
        finalCoef = percentScale * dmDecimal * rawValue;
      }

      return { name: ingredient.name, coef: finalCoef };
    }),
    
    bnds: {
      type: bndType,
      lb: Number(nutrient.minimum) || 0,          // grams
      ub: (nutrient.maximum) ? Number(nutrient.maximum) : undefined
    }
  };
});

console.log("=== NUTRIENT COEFFICIENT CHECK (grams per 1%) ===");
constraints
  .filter(c => !c.name.includes("Group") && !c.name.includes("Total Mixture"))
  .forEach(c => {
    const sumCoef = c.vars.reduce((sum, v) => sum + v.coef, 0);
    console.log(`${c.name.padEnd(25)} → ${sumCoef.toFixed(3)} g per 1%  (at 100% diet ≈ ${ (sumCoef * 100).toFixed(0) } g)`);
  });
//Define Groups for easier access in the future (e.g. for different handling of forage vs concentrate)
  const forageIngredients = ingredients.filter(ing => {
    const data = ingredientsData.find(d => d._id.toString() === ing.ingredient_id.toString());
    return data.group === 'Grass' || data.group === 'Legumes';
  });

  const legumeIngredients = ingredients.filter(ing => {
    const data = ingredientsData.find(d => d._id.toString() === ing.ingredient_id.toString());
    console.log("CHECKING LEGUME GROUP", data.name, data.group);
    return data.group === 'Legumes';
  });

  const byproductIngredients = ingredients.filter(ing => {
    const data = ingredientsData.find(d => d._id.toString() === ing.ingredient_id.toString());
    return data.group === 'Agricultural by-products' || data.group === 'Industrial by-products';
  });

  const vitaminmineral = ingredients.filter(ing => {
    const data = ingredientsData.find(d => d._id.toString() === ing.ingredient_id.toString());
    return data.group === 'Vitamin-Mineral' || data.group === 'Vitamin-Mineral';
  });

 
  

  console.log("Forage Ingredients:", forageIngredients);
  console.log("Byproduct Ingredients:", byproductIngredients);
  console.log("Vitamin-Mineral Ingredients:", vitaminmineral);

  constraints.push({
    name: "Group: Grasses & Legumes (60-100%)",
    vars: ingredients.map(ing => {
      const isForage = forageIngredients.some(f => f.name === ing.name);

      if (isPercentMode) {
        // In percent mode: just check if their % share is 60–100%
        return { name: ing.name, coef: isForage ? 1 : 0 };
      } else {
        // In gram mode: DM-weighted as before
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        return { name: ing.name, coef: isForage ? dmDecimal : 0 };
      }
    }),
    bnds: {
      type: "GLP_DB",
      lb: isPercentMode ? 60 : (dmTarget * 0.60),
      ub: isPercentMode ? 100 : dmTarget
    }
  });

  constraints.push({
    name: "Group: Byproducts (0-40%)",
    vars: ingredients.map(ing => {
      const isByproduct = byproductIngredients.some(b => b.name === ing.name);
      if (isPercentMode) {
        return { name: ing.name, coef: isByproduct ? 1 : 0 };
      } else {
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        return { name: ing.name, coef: isByproduct ? dmDecimal : 0 };
      }
    }),
    bnds: {
      type: "GLP_UP",
      lb: 0,
      ub: isPercentMode ? 40 : (dmTarget * 0.40)
    }
  });

  constraints.push({
    name: "Group: Vitamin-Mineral (0-3%)",
    vars: ingredients.map(ing => {
      const isVM = vitaminmineral.some(v => v.name === ing.name);
      if (isPercentMode) {
        return { name: ing.name, coef: isVM ? 1 : 0 };
      } else {
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        return { name: ing.name, coef: isVM ? dmDecimal : 0 };
      }
    }),
    bnds: {
      type: "GLP_UP",
      lb: 0,
      ub: isPercentMode ? 3 : (dmTarget * 0.03)
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
      ub: isPercentMode ? 15 : 5000
    }
  });

  if (isPercentMode) {
    constraints.push({
      name: "Total Mixture Weight (Percent Mode)",
      vars: ingredients.map(ing => ({ name: ing.name, coef: 1 })),
      bnds: {
        type: "GLP_FX",  // ✅ Exactly 100%, not UP to 105%
        lb: 100,
        ub: 100
      }
    });
  }
  // constraints.push({
  //   name: "Total Mixture Weight",
  //   vars: ingredients.map(ing => ({ name: ing.name, coef: 1 })),
  //   bnds: {
  //     type: "GLP_FX", 
  //     lb: 0,
  //     ub: weight
  //   }
  // });
  // === nutrient ratio constraints ===
  for (const ratio of nutrientRatioConstraints) {
    // Accept both ID and name for each nutrient
    const firstNutrientId = ratio.firstIngredientId || ratio.firstIngredient;
    const secondNutrientId = ratio.secondIngredientId || ratio.secondIngredient;
    const firstNutrientName = ratio.firstIngredient;
    const secondNutrientName = ratio.secondIngredient;
    const { operator, firstIngredientRatio, secondIngredientRatio } = ratio;
    if (!firstNutrientId || !secondNutrientId || !operator || !firstIngredientRatio || !secondIngredientRatio) continue;
    const ratioValue = firstIngredientRatio / secondIngredientRatio;
// Inside the nutrientRatioConstraints loop:
    const vars = ingredients.map(ingredient => {
      const ingData = ingredientsData.find(item => item.name === ingredient.name);
      let n1 = 0, n2 = 0;

      if (ingData && Array.isArray(ingData.nutrients)) {
        // Get the DM of the ingredient
        const dmValue = ingData.nutrients.find(n => n.name === 'Dry Matter' || n.name === 'DM')?.value || 100;
        const dmDecimal = dmValue / 100;

        // If you are setting a ratio between Feed Materials (like Napier vs Concentrate)
        // The Excel ratio applies to their DM contribution
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
    



    // DEBUG
    console.log(`[Nutrient Ratio Constraint] ${firstNutrientName || firstNutrientId} / ${secondNutrientName || secondNutrientId} ${operator} ${ratioValue}`);
    console.log(vars.map(v => `${v.name}: ${v.coef}`).join(', '));
    
    // If all coefs are zero, then skip 
    if (vars.every(v => v.coef === 0)) {
      console.warn(`[Nutrient Ratio Constraint] Skipping constraint for ${firstNutrientName || firstNutrientId} / ${secondNutrientName || secondNutrientId} because all coefficients are zero.`);
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
      continue; // Unknown operator
    }
    constraints.push({
      name: `Ratio: ${firstNutrientName || firstNutrientId}/${secondNutrientName || secondNutrientId} ${operator} ${ratioValue}`,
      vars,
      bnds
    });
  }

  // === ingredient variable bounds === (e.g. 1 <= x1 <= 14)
// === ingredient variable bounds === 


// === ingredient variable bounds ===
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

  // // === total ratio constraint ===
  // const totalRatioConstraint = {
  //   name: "Total Ratio",
  //   vars: ingredients.map(ingredient => ({
  //     name: ingredient.name,
  //     coef: 1 // Coefficient of 1 for each ingredient to sum to 100%
  //   })),
  //   bnds: {
  //     type: "GLP_FX", // Fixed bound (exactly equal)
  //     lb: weight,  // Sum of proportions equals 1 (100%)
  //     ub: weight
  //   }
  // };

  // // Add the total ratio constraint to the existing constraints
  // constraints.push(totalRatioConstraint);

  // console.log("objectives", objectives);
  // console.log("constraints", constraints);
  // console.log("variableBounds", variableBounds);
  console.log("--- FINAL SOLVER CHECK ---");
console.log("Assumed Total Weight:", assumedWeight);
console.log("DM Target:", dmTarget);
console.log("First 3 Constraints Bounds:", constraints.slice(0, 3).map(c => ({name: c.name, lb: c.bnds.lb, ub: c.bnds.ub})));
console.log("Variable Bounds (First Ing):", variableBounds[0]);

  console.log("=== FULL CONSTRAINT DEBUG ===");
console.log("type:", type);
console.log("weight:", weight);
console.log("percentScale:", percentScale);
console.log("dmTarget:", dmTarget);

constraints.forEach((c, i) => {
  console.log(`\nConstraint[${i}]: ${c.name}`);
  console.log(`  bounds: lb=${c.bnds.lb}, ub=${c.bnds.ub}, type=${c.bnds.type}`);
  c.vars.forEach(v => {
    console.log(`  var: ${v.name}, coef=${v.coef}`);
  });
});

console.log("\n=== VARIABLE BOUNDS DEBUG ===");
variableBounds.forEach(v => {
  console.log(`${v.name}: lb=${v.lb}, ub=${v.ub}, type=${v.type}`);
});

console.log("\n=== FEASIBILITY MANUAL CHECK ===");
// Manually test if the previous solution (94.215%) would satisfy all constraints
const testSolution = {};
ingredients.forEach(ing => { testSolution[ing.name] = 94.215; }); // rough test
constraints.forEach(c => {
  let lhs = 0;
  c.vars.forEach(v => { lhs += v.coef * (testSolution[v.name] || 0); });
  const lb = c.bnds.lb ?? -Infinity;
  const ub = c.bnds.ub ?? Infinity;
  const feasible = lhs >= lb && lhs <= ub;
  console.log(`${c.name}: LHS=${lhs.toFixed(4)}, lb=${lb}, ub=${ub}, feasible=${feasible}`);
});
  return { objectives, constraints, variableBounds, weight, dietTotalWeight, ingredientsData };
}


const determineOptimizedNutrients = (optimizedIngredients, constraints, type, dietTotalWeight) => {
  // coef already scaled by percentScale, value is in percent
  // coef * value = (original_coef * percentScale) * percent = grams already
  return constraints.map(constraint => {
    let optimizedNutrientValue = 0;
    Object.entries(optimizedIngredients).forEach(([ingredient, value]) => {
      const involvedIngredient = constraint.vars.find(v => v.name === ingredient);
      if (!involvedIngredient) return;
      optimizedNutrientValue += involvedIngredient.coef * value;
    });
    return {
      name: constraint.name,
      value: optimizedNutrientValue  // ✅ already in grams, no extra scaling
    };
  });
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
  // console.log("Simplex Request body", req.body)
  
  const { objectives, constraints, variableBounds, weight} = await formatInput(req.body);

  const dmTarget = nutrients?.find(n => 
    n.name?.toLowerCase().includes("dry matter") || n.name?.toLowerCase() === "dm"
  )?.minimum || weight;

  
  // const dietTotalWeight = type === 'percent' ? (dmTarget / 0.28) : weight;
  const dietTotalWeight = type === 'percent' ? (weight) : weight;
  const percentScale = type === 'percent' ? (dietTotalWeight / 100) : 1;


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

    // Map of constraints code (e.g., c0, c1) to make result from GLPK readable
    // especially for retrieving dual values (shadow prices)
    const constraintsMap = {};
    // format the constraints to be used in the optimization
    const subjects = [];
    for (let i = 0; i < constraints.length; i++) {
      const constraintCode = 'c' + i;
      constraintsMap[constraintCode] = constraints[i].name; // Added for shadow price retrieval
      
      console.log("=======================================DEBUG HERE=======================================")

      
      console.log(constraints[i].name);
      subjects.push({
        name: constraintCode,
        vars: constraints[i].vars,  // variables
        // sample: [{ name: 'x1', coef: 1.0 }, { name: 'x2', coef: 2.0 }],
        bnds: constraints[i].bnds   // bounds
        // sample: { type: glpk.GLP_UP, ub: 40.0, lb: 0.0 }
      });
      subjects[i].bnds.type = glpk[subjects[i].bnds.type];    // convert the bound type to GLPK format
    }

    // format the variable bounds to be used in the optimization
    const varsSubjects = [];
    for (let i = 0; i < variableBounds.length; i++) {
      varsSubjects.push({
        name: variableBounds[i].name,
        type: variableBounds[i].type,
        ub: variableBounds[i].ub,
        lb: variableBounds[i].lb

      });
      varsSubjects[i].type = glpk[varsSubjects[i].type];    // convert the bound type to GLPK format
    }

    // @@@@@@@@@@@ PASTE DEBUG CODE HERE @@@@@@@@@@@
    // console.log("=== SIMPLEX MATRIX DEBUG ===");
    // console.log(`Target Weight (Variables Upper Bound): ${weight}`);
    
    // subjects.forEach(sub => {
    //   const constraintName = constraintsMap[sub.name];
    //   const boundInfo = `LB: ${sub.bnds.lb}, UB: ${sub.bnds.ub}`;
    //   console.log(`Constraint: ${constraintName} | ${boundInfo}`);
    // });
    // console.log("============================");

     
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // run the optimization

    // Add this right before glpk.solve(...)
console.log("=== QUICK FEASIBILITY PRE-CHECK ===");
console.log("Can DM constraint be met?");
const maxDM = variableBounds.reduce((sum, vb) => {
  const constraint = constraints.find(c => c.name === 'Dry Matter');
  if (!constraint) return sum;
  const varCoef = constraint.vars.find(v => v.name === vb.name);
  return sum + (varCoef ? varCoef.coef * vb.ub : 0);
}, 0);
const dmConstraint = constraints.find(c => c.name === 'Dry Matter');
console.log(`Max possible DM LHS: ${maxDM}, Required lb: ${dmConstraint?.bnds.lb}`);
console.log(`DM feasible: ${maxDM >= (dmConstraint?.bnds.lb ?? 0)}`);
    const output = glpk.solve({
      name: 'LP',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: objectives
        // sample: [{ name: 'x1', coef: 1.2 }, { name: 'x2', coef: 1.5 }]
      },
      subjectTo: [
        ...subjects
      ],
      bounds: [
        ...varsSubjects
      ]
    }, options);

    console.log(`optimal is ${glpk.GLP_OPT}; but it's ${output.result.status}`)
    // Check if the result has an optimal solution

    let isSuccessful = false;

    // if (type === 'simplex-dry-matter') {
    //   // Strict check: must be exactly GLP_OPT (Optimal)
    //   isSuccessful = (output.result.status === glpk.GLP_OPT);
    // } else {
    //   // Loose check: any truthy status (Feasible, Suboptimal, etc.)
    //   isSuccessful = !!output.result.status;
    // }
    isSuccessful = (output.result.status === glpk.GLP_OPT);

    // if (output.result.status == glpk.GLP_OPT) {
    if (isSuccessful) {
      console.log("optimal found!")
      console.log("=======================================DEBUG HERE=======================================")
      console.log("optimize-controller.js")
      console.log(output)
      
      // reformat ingredients to be used in the response (make it an array of objects)
      const optimizedIngredients = [];

      let totalAsFedWeight = 0;
      Object.entries(output.result.vars).forEach(([key, value]) => {
        optimizedIngredients.push({ name: key, value: value });
        totalAsFedWeight += value;
      });
      const optimizedNutrients = determineOptimizedNutrients(
        output.result.vars, constraints, type, dietTotalWeight
      );

      const finalCost = computeCost(
        optimizedIngredients, objectives, type, dietTotalWeight
      );

      totalAsFedWeight = totalAsFedWeight * percentScale;

      
      // Retrieval of shadow prices (dual values from result/output)
      const shadowPrices = Object.entries(output.result.dual).map(([key, value]) => {
        return {
          constraint: constraintsMap[key] || key,
          shadowPrice: value
        };
      });

      

      // Return the solution values
      res.status(200).json({
        status: 'Optimal solution found',
        // objectives: objectives,
        constraints: constraints,
        // variableBounds: variableBounds,
        optimizedCost: finalCost, // output.result.z,
        optimizedIngredients: optimizedIngredients,
        optimizedNutrients: optimizedNutrients,
        shadowPrices: shadowPrices,
        weight: totalAsFedWeight
      });

    } else {

      console.log("optimal not found! Starting AI Diagnosis...");

      const formatResult = await formatInput(req.body);
      
      const structuralGaps = smartDiagnosis(constraints, variableBounds, type);
      const nutrientGaps = diagnoseNutrientShortages(
        constraints, 
        formatResult.ingredientsData,
        req.body.ingredients,
        type
      );

      const ingredientSuggestions = suggestIngredients(
        nutrientGaps,
        formatResult.ingredientsData,
        req.body.ingredients
      );
      
      const smartIngredientSuggestions = suggestByGroupEnhanced(
        nutrientGaps,
        formatResult.ingredientsData,
        req.body.ingredients,
        constraints,
        type
      );


      // ==================== IMPROVED PRIORITY ADVICE ====================
      let priorityAdvice = "Unknown infeasibility.";
      let suggestion = "Try relaxing tight constraints or adding high-nutrient ingredients.";

      if (structuralGaps.length > 0) {
        priorityAdvice = structuralGaps[0].message || "Fix ingredient min/max bounds or group limits first.";
        suggestion = structuralGaps[0].recommendation || "Reduce conflicting minimum percentages.";
      } 
      else if (nutrientGaps.length > 0) {
        const critical = nutrientGaps[0];
        priorityAdvice = `Shortage in ${critical.nutrient}: Need ${critical.required} but max possible is only ${critical.maxPossible}.`;
        suggestion = critical.recommendation || `Reduce NapierGrass minimum % or add more high-${critical.nutrient} concentrates.`;
      } 
      else {
        priorityAdvice = "Complex infeasibility: Group limits + high minimums on low-nutrient ingredients (especially NapierGrass) make the formulation impossible.";
        suggestion = "1. Reduce NapierGrass minimum (e.g. 98% → 70%). 2. Lower forage group minimum. 3. Add more high-TDN concentrates.";
      }

      res.status(400).json({
        status: 'No optimal solution',
        message: output.result.status || 'Infeasible formulation',
        structuralIssues: structuralGaps,
        nutrientIssues: nutrientGaps,
        priorityAdvice,
        suggestion,
        ingredientSuggestions,
        smartIngredientSuggestions,
      });
    }
    
    
  } catch (error) {
    console.error("Error in Simplex optimization:", error);
    res.status(500).json({ error: "An error occurred during Simplex optimization." });
  }

}

export {
  simplex,
};
