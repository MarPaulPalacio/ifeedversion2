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

const formatInput = async (data) => {
  // Accept nutrientRatioConstraints from the request body (default to empty array if not present)
  const { userId, ingredients, nutrients, weight, type, nutrientRatioConstraints = [] } = data;
  console.log("RAW NUTRIENTS FROM REQUEST:", JSON.stringify(nutrients, null, 2));
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

const dietTotalWeight = type === 'percent' ? (weight) : weight;

const percentScale = type === 'percent' ? (dietTotalWeight / 100) : 1;

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
      lb: nutrient.minimum || 0,          // grams
      ub: nutrient.maximum ? nutrient.maximum : undefined
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

      if (type === 'percent') {
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
      lb: type === 'percent' ? 60 : (dmTarget * 0.60),
      ub: type === 'percent' ? 100 : dmTarget
    }
  });

  constraints.push({
    name: "Group: Byproducts (0-40%)",
    vars: ingredients.map(ing => {
      const isByproduct = byproductIngredients.some(b => b.name === ing.name);
      if (type === 'percent') {
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
      ub: type === 'percent' ? 40 : (dmTarget * 0.40)
    }
  });

  constraints.push({
    name: "Group: Vitamin-Mineral (0-3%)",
    vars: ingredients.map(ing => {
      const isVM = vitaminmineral.some(v => v.name === ing.name);
      if (type === 'percent') {
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
      ub: type === 'percent' ? 3 : (dmTarget * 0.03)
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
      ub: type === 'percent' ? 20 : 5000
    }
  });

  if (type === "percent") {
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

  let lb = ingredient.minimum || 0;
  let ub = ingredient.maximum || (type === 'percent' ? 100 : (weight || 100000));

  // ✅ DO NOT scale percent bounds — keep them as 0–100
  // The nutrient constraint coefficients will be adjusted instead

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
  return { objectives, constraints, variableBounds, weight, dietTotalWeight };
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

  const { type, nutrients } = req.body;
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
        // console.log("Optimal not found! Starting AI Diagnosis...");

        // // Fetch all ingredients to see what the user is MISSING
        // const allIngredients = await fetchIngredientsData(req.body.userId);
        // console.log('DIAGNOSIS', smartDiagnosis(constraints, variableBounds));
        // // Run the diagnostic logic
        // const AI_Suggestions = diagnoseInfeasibility(constraints, allIngredients, req.body.ingredients);

        // const nutrientGaps = diagnoseInfeasibility(constraints, allIngredients, req.body.ingredients);
        // const structuralGaps = smartDiagnosis(constraints, variableBounds);
        // res.status(400).json({
        //     status: 'No optimal solution',
        //     message: output.status,
        //     // message: "I couldn't find a solution that meets all nutrient requirements with your current ingredient list.",
        //     diagnostics: AI_Suggestions, // This is the AI Layer
        //     possibleFixes: AI_Suggestions.map(d => d.recommendation),
        //     smartDiagnosis: smartDiagnosis(constraints, variableBounds),
        //     structuralBottlenecks: structuralGaps, // Check these first!
        //     nutrientShortages: nutrientGaps,
        //     advice: structuralGaps.length > 0 
        //         ? "Fix your Group/Weight limits first." 
        //         : "Try adding higher quality ingredients."
      
        // });
        
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

export {
  simplex,
};
