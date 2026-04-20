import GLPK from 'glpk.js';
import PSO from 'pso';
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

const formatInput = async (data) => {
  // Accept nutrientRatioConstraints from the request body (default to empty array if not present)
  const { userId, ingredients, nutrients, weight, type, nutrientRatioConstraints = [] } = data;
  const ingredientsData = await fetchIngredientsData(userId);
  
 

  


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
// Map Constraints
const constraints = nutrients.map(nutrient => {
  const bndType = nutrient.maximum ? "GLP_DB" : "GLP_LO";
  const isDM = nutrient.nutrient_id === dmNutrientId || 
               nutrient.name?.toLowerCase().includes("dry matter") || 
               nutrient.name?.toLowerCase() === "dm";
  console.log("NUtrient ID here:", dmNutrientId);
  console.log("Nutrients here:", nutrients);
  return {
    name: nutrient.name,
    unit: nutrient.unit,
    vars: ingredients.map(ingredient => {
      const ingData = ingredientsData.find(item => 
        (item._id?.toString() === ingredient.ingredient_id) || 
        (item.ingredient_id?.toString() === ingredient.ingredient_id)
      );

      // Find DM for this specific ingredient (e.g., 25 for Napier)
      let dmDecimal = 1.0; // Default to 1.0 (100%) if DM info is missing
      if (dmNutrientId) {
        const dmEntry = ingData.nutrients.find(n => 
          n.nutrient.toString() === dmNutrientId.toString()
        );
        console.log("DM ENTRY", dmEntry);
      console.log("ingData", ingData);
      const dmValue = dmEntry?.value || 100; // Default to 100% (1.0) if missing
      dmDecimal = dmValue;
      }

      
      // Find the current nutrient's raw value (e.g., 7 for CP)
      const nutrientEntry = ingData.nutrients.find(n => 
        (n.nutrient?.toString() === nutrient.nutrient_id) || (n.name === nutrient.name)
      );
      const rawValue = nutrientEntry?.value || 0;

      let finalCoef;
      if (isDM) {
        // If this row IS the DM constraint, use just the DM decimal
        finalCoef = dmDecimal;
      } else {
        // Otherwise, use Excel math: (DM decimal * Nutrient decimal)
        // This calculates kg of nutrient per 1kg of As-Fed weight
        finalCoef = dmDecimal * (rawValue);
        // Convert to grams if the requirement unit is 'g' (e.g., CP target is 480.5g)
      }

      return { name: ingredient.name, coef: finalCoef };
    }),
    bnds: {
      type: bndType,
      lb: nutrient.minimum || 0,
      ub: nutrient.maximum
    }
  };
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

  const dmTarget = nutrients.find(n => 
    n.name?.toLowerCase().includes("dry matter") || n.name?.toLowerCase() === "dm"
  )?.minimum || weight; // Fallback to weight if not found (though usually DM is smaller)
  
  const assumedWeight = weight || (dmTarget * 1.5);

  

  console.log("Forage Ingredients:", forageIngredients);
  console.log("Byproduct Ingredients:", byproductIngredients);
  console.log("Vitamin-Mineral Ingredients:", vitaminmineral);

  constraints.push({
    name: "Group: Legumes Constraint",
    vars: ingredients.map(ing => {
      const isLegume = legumeIngredients.some(l => l.name === ing.name);
      return { name: ing.name, coef: isLegume ? 1 : 0 };
    }),
    bnds: {
      type: "GLP_UP",
      lb: 0,
      // Use the assumed weight fallback here too!
      ub: type=== "percent" ? (0.20 * (weight || dmTarget * 1.5)) : 5000
    }
  });

  // 1. ADD FORAGE GROUP CONSTRAINT (60-100%)
  constraints.push({
    name: "Group: Grasses & Legumes (60-100%)",
    vars: ingredients.map(ing => {
      const isForage = forageIngredients.some(f => f.name === ing.name);
      
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        
        return {
          name: ing.name,
          coef: isForage ? dmDecimal : 0
        };

    }),
    bnds: {
      type: "GLP_DB",
      lb: (dmTarget * 0.60),
      ub: dmTarget
    }
  });

  constraints.push({
    name: "Group: Byproducts (0-30%)",
    vars: ingredients.map(ing => {
      const isByproduct = byproductIngredients.some(b => b.name === ing.name);
      
      
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        
        return {
          name: ing.name,
          coef: isByproduct ? dmDecimal : 0
        };
      
    }),
    bnds: {
      type: "GLP_UP",
      lb: 0,
      ub: (dmTarget * 0.40) 
    }
  });

  constraints.push({
    name: "Group: Vitamin-Mineral (0-3%)",
    vars: ingredients.map(ing => {
      const isVM = vitaminmineral.some(v => v.name === ing.name);
      
        const ingData = ingredientsData.find(d => d._id?.toString() === ing.ingredient_id?.toString());
        const dmEntry = ingData?.nutrients.find(n => n.nutrient?.toString() === dmNutrientId?.toString());
        const dmDecimal = dmEntry?.value || 1.0;
        
        return {
          name: ing.name,
          coef: isVM ? dmDecimal : 0
        };
  
    }),
    bnds: {
      type: "GLP_UP",
      lb: 0,
      ub: (dmTarget * 0.03) 
    }
  });

  if (type === "percent") {
    constraints.push({
      name: "Total Mixture Weight (Percent Mode)",
      vars: ingredients.map(ing => ({ name: ing.name, coef: 1 })),
      bnds: {
        type: "GLP_UP", // GLP_FX means exactly equal
        lb: 0,
        ub: assumedWeight * 1.05
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


  const variableBounds = ingredients.map(ingredient => {
    const bndType = ingredient.maximum ? "GLP_DB" : "GLP_LO";

    let lb = ingredient.minimum || 0;
    // If weight is undefined, give it a massive upper bound so it doesn't restrict the solver
    let ub = ingredient.maximum || (weight || 100000); 

    // If type is percent, we need a fallback weight to calculate the grams.
    // Using dmTarget * 1.5 is a safe estimate for total as-fed weight.


    if (type=== "percent") {
      lb = (lb / 100) * assumedWeight;
      ub = (ub / 100) * assumedWeight;
    }

    return {
      name: ingredient.name,
      type: bndType,
      lb: lb,
      ub: ub
    }
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
  return { objectives, constraints, variableBounds, weight };
}


const determineOptimizedNutrients = (optimizedIngredients, constraints) => {
  // const total = Object.values(optimizedIngredients).reduce((sum, value) => sum + value, 0);
  // const ratios = {};
  // for (const [ingredient, value] of Object.entries(optimizedIngredients)) {
  //   ratios[ingredient] = total > 0 ? (value / total) : 0.00;
  // }
  return constraints.map(constraint => {
    let optimizedNutrientValue = 0;
    
    Object.entries(optimizedIngredients).forEach(([ingredient, value]) => {
      const involvedIngredient = constraint.vars.find(v => v.name === ingredient);
      if (!involvedIngredient) return;

      // If 'value' is 7 (kg) and 'coef' is 10 (mg/kg), this results in 70mg.
      optimizedNutrientValue += involvedIngredient.coef * value; 
    });
    return {
      name: constraint.name,
      value: optimizedNutrientValue
    };
  });
  // const finalNutrients = constraints.map(constraint => {
  //   const nutrientName = constraint.name;
  //   let optimizedNutrientValue = 0;
  //   // get the percentage of each optimized ingredient
  //   Object.entries(optimizedIngredients).forEach(([ingredient, value]) => {
  //     const involvedIngredient = constraint.vars.find(v => v.name === ingredient);
  //     if (!involvedIngredient) return;
  //     const nutrientValue = involvedIngredient.coef * value;   // e.g. (8% protein * 60% part of mix) OR 3350 kcal/kg * 40% part of mix
  //     optimizedNutrientValue += nutrientValue;
  //   })
  //   return {
  //     name: nutrientName,
  //     value: optimizedNutrientValue
  //   }
  // })
  // return finalNutrients;
}

const computeCost = (optimizedIngredients, objectives, weight) => {
  // objectives are the ingredients and its prices
  // optimizedIngredients contain the ratio for the ingredients
  let cost = 0;
  for (let i = 0; i < objectives.length; i++) {
    let ingWeight = optimizedIngredients[i].value;
    //let ingWeight = (optimizedIngredients[i].value) * weight; // value% * weight (e.g. 30% of 1000kg)
    cost += objectives[i].coef * ingWeight;
  }
  return cost;
}

const simplex = async (req, res) => {

  const { type } = req.body;
  // console.log("Simplex Request body", req.body)
  const { objectives, constraints, variableBounds, weight} = await formatInput(req.body);
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
      
      // determine the optimized nutrients
      const optimizedNutrients = determineOptimizedNutrients(output.result.vars, constraints);
      // reformat ingredients to be used in the response (make it an array of objects)
      const optimizedIngredients = [];
      let totalAsFedWeight = 0;
      Object.entries(output.result.vars).forEach(([key, value]) => {
        optimizedIngredients.push({
          name: key,
          value: value
        });
        totalAsFedWeight += value;
      });

      const finalCost = computeCost(optimizedIngredients, objectives, weight);

      
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
      console.log("optimal not found!");
      // If no optimal solution is found, send a message
      res.status(400).json({
        status: 'No optimal solution',
        message: output.status,
      });
    }
  } catch (error) {
    console.error("Error in Simplex optimization:", error);
    res.status(500).json({ error: "An error occurred during Simplex optimization." });
  }

}





/**
 * PSO optimization function
 * @param {Object} options PSO algorithm parameters
 * @param {Number} options.iterations Maximum number of iterations
 * @param {Number} options.particles Number of particles in the swarm
 * @param {Number} options.inertia Inertia ratio for velocity update
 * @param {Number} options.social Social (global best) coefficient
 * @param {Number} options.personal Personal (particle best) coefficient
 * @param {Number} options.tolerance Convergence tolerance
 */
const psoOptimizeOriginal = (objectives, constraints, variableBounds, weight, options = {}) => {
  const defaults = {
    iterations: 2000,
    particles: 50,
    inertia: 0.7,
    social: 1.5,
    personal: 1.5,
    tolerance: 1e-6
  };

  const settings = { ...defaults, ...options };

  // Extract ingredient names
  const ingredientNames = objectives.map(obj => obj.name);

  // Create variable bounds array in the format needed for PSO
  const bounds = [];

  variableBounds.forEach(bound => {
    const lb = bound.lb !== undefined ? bound.lb : 0;
    const ub = bound.ub !== undefined ? bound.ub : 1; // Changed from 100 to 1
    bounds.push([lb, ub]);
  });

  // Initialize particles
  const particles = [];
  for (let i = 0; i < settings.particles; i++) {
    // Random initial position within bounds
    const position = variableBounds.map((bound, idx) => {
      const lb = bound.lb !== undefined ? bound.lb : 0;
      const ub = bound.ub !== undefined ? bound.ub : 1; // Changed from 100 to 1
      return lb + Math.random() * (ub - lb);
    });

    // Adjust to meet total ratio constraint
    let totalRatio = position.reduce((sum, val) => sum + val, 0);
    if (totalRatio > 0) {
      // Scale to sum to 1 (instead of 100)
      position.forEach((val, idx) => {
        position[idx] = val / totalRatio;
      });
    } else {
      // If all zeros, distribute evenly
      const equalRatio = 1 / position.length; // Changed from 100 to 1
      position.forEach((val, idx) => {
        position[idx] = equalRatio;
      });
    }

    // Random initial velocity
    const velocity = variableBounds.map((bound) => {
      const lb = bound.lb !== undefined ? bound.lb : 0;
      const ub = bound.ub !== undefined ? bound.ub : 1; // Changed from 100 to 1
      const range = ub - lb;
      return -range / 10 + Math.random() * range / 5; // Velocity in range [-range/10, range/10]
    });

    particles.push({
      position,
      velocity,
      bestPosition: [...position],
      bestFitness: Infinity
    });
  }

  // Global best
  let globalBestPosition = null;
  let globalBestFitness = Infinity;

  // Fitness function (objective + penalty for constraint violations)
  function calculateFitness(position) {
    // Create a mapping of ingredient name to position value
    const positionMap = {};
    ingredientNames.forEach((name, idx) => {
      positionMap[name] = position[idx];
    });

    // Calculate objective value (cost)
    let cost = 0;
    objectives.forEach((obj, idx) => {
      cost += obj.coef * position[idx];
    });

    // Calculate constraint violations
    let penalty = 0;

    // Check total ratio constraint (should be exactly 1)
    const totalRatio = position.reduce((sum, val) => sum + val, 0);
    penalty += Math.abs(totalRatio - 1) * 1000; // Strong penalty for total ratio deviation

    // Check other constraints
    constraints.forEach(constraint => {
      // Skip the total ratio constraint as we handled it separately
      if (constraint.name === "Total Ratio") return;

      // Calculate the current value for this constraint
      let constraintValue = 0;
      constraint.vars.forEach((variable) => {
        const ingredientIndex = ingredientNames.indexOf(variable.name);
        if (ingredientIndex !== -1) {
          constraintValue += variable.coef * position[ingredientIndex];
        }
      });

      // Check if constraint is violated
      if (constraint.bnds.type === "GLP_LO" || constraint.bnds.type === "GLP_DB") {
        // Lower bound constraint
        if (constraintValue < constraint.bnds.lb) {
          penalty += (constraint.bnds.lb - constraintValue) * 1000;
        }
      }

      if (constraint.bnds.type === "GLP_UP" || constraint.bnds.type === "GLP_DB") {
        // Upper bound constraint
        if (constraintValue > constraint.bnds.ub) {
          penalty += (constraintValue - constraint.bnds.ub) * 1000;
        }
      }

      if (constraint.bnds.type === "GLP_FX") {
        // Fixed constraint
        penalty += Math.abs(constraintValue - constraint.bnds.lb) * 1000;
      }
    });

    // Check variable bounds
    variableBounds.forEach((bound, idx) => {
      if (bound.type === "GLP_LO" || bound.type === "GLP_DB") {
        if (position[idx] < bound.lb) {
          penalty += (bound.lb - position[idx]) * 1000;
        }
      }

      if (bound.type === "GLP_UP" || bound.type === "GLP_DB") {
        if (position[idx] > bound.ub) {
          penalty += (position[idx] - bound.ub) * 1000;
        }
      }
    });

    return cost + penalty;
  }

  // Run PSO iterations
  let converged = false;
  let bestFitness = Infinity;
  let lastImprovement = 0;

  console.log("Starting PSO optimization...");

  for (let iter = 0; iter < settings.iterations && !converged; iter++) {
    // Update each particle
    particles.forEach(particle => {
      // Calculate fitness
      const fitness = calculateFitness(particle.position);

      // Update personal best
      if (fitness < particle.bestFitness) {
        particle.bestFitness = fitness;
        particle.bestPosition = [...particle.position];

        // Update global best
        if (fitness < globalBestFitness) {
          globalBestFitness = fitness;
          globalBestPosition = [...particle.bestPosition];
          lastImprovement = iter;
        }
      }

      // Update velocity and position
      particle.position.forEach((pos, idx) => {
        // Update velocity with inertia, cognitive and social components
        particle.velocity[idx] =
          settings.inertia * particle.velocity[idx] +
          settings.personal * Math.random() * (particle.bestPosition[idx] - pos) +
          settings.social * Math.random() * (globalBestPosition[idx] - pos);

        // Update position
        particle.position[idx] = pos + particle.velocity[idx];

        // Clamp position to bounds
        if (variableBounds[idx].type === "GLP_LO" || variableBounds[idx].type === "GLP_DB") {
          particle.position[idx] = Math.max(variableBounds[idx].lb, particle.position[idx]);
        }

        if (variableBounds[idx].type === "GLP_UP" || variableBounds[idx].type === "GLP_DB") {
          particle.position[idx] = Math.min(variableBounds[idx].ub, particle.position[idx]);
        }
      });

      // Enforce total ratio constraint = 1
      let totalRatio = particle.position.reduce((sum, val) => sum + val, 0);
      if (totalRatio > 0) {
        particle.position.forEach((val, idx) => {
          particle.position[idx] = val / totalRatio;
        });
      }
    });

    // Check for convergence every 100 iterations
    if (iter > 0 && iter % 100 === 0) {
      const currentBestFitness = calculateFitness(globalBestPosition);
      const improvement = Math.abs(bestFitness - currentBestFitness);

      if (improvement < settings.tolerance || (iter - lastImprovement > 500)) {
        converged = true;
        console.log(`Converged at iteration ${iter}, improvement: ${improvement}`);
      }

      bestFitness = currentBestFitness;
    }
  }

  // Format the results to match the simplex output
  const optimizedIngredients = {};
  ingredientNames.forEach((name, idx) => {
    optimizedIngredients[name] = globalBestPosition[idx];
  });

  // Determine optimized nutrients
  const optimizedNutrients = determineOptimizedNutrients(optimizedIngredients, constraints);

  // Format output
  const formattedOptimizedIngredients = ingredientNames.map((name, idx) => ({
    name,
    value: globalBestPosition[idx]
  }));

  const optimizedCost = objectives.reduce((sum, obj, idx) =>
    sum + obj.coef * globalBestPosition[idx], 0);

  return {
    status: 'Optimal solution found',
    optimizedCost,
    optimizedIngredients: formattedOptimizedIngredients,
    optimizedNutrients
  };
};

const pso = async (req, res) => {
  const { objectives, constraints, variableBounds, weight } = await formatInput(req.body)

  console.log(objectives, constraints, variableBounds, weight)
};
const psoOriginal = async (req, res) => {
  const { objectives, constraints, variableBounds, weight } = await formatInput(req.body);

  try {
    console.log("Running PSO optimization...");

    // Configure PSO options
    const options = {
      iterations: 2000,
      particles: 50,
      inertia: 0.7,
      social: 1.5,
      personal: 1.5,
      tolerance: 1e-5
    };

    // Run PSO optimization
    const output = psoOptimize(objectives, constraints, variableBounds, weight, options);

    if (output.status === 'Optimal solution found') {
      const finalCost = computeCost(output.optimizedIngredients, objectives, weight);
      res.status(200).json({
        status: 'Optimal solution found',
        constraints: constraints,
        optimizedCost: finalCost, // output.optimizedCost,
        optimizedIngredients: output.optimizedIngredients,
        optimizedNutrients: output.optimizedNutrients
      });
    } else {
      res.status(400).json({
        status: 'No optimal solution',
        message: output.status,
      });
    }
  } catch (error) {
    console.error("Error in PSO optimization:", error);
    res.status(500).json({ error: "An error occurred during PSO optimization." });
  }
};


export {
  simplex,
  pso
};
