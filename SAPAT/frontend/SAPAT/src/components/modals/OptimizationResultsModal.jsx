import { useEffect, useState, React } from 'react';
import { RiCloseLine, RiArrowRightSLine, RiLayoutGridLine, RiTableLine } from 'react-icons/ri';
import Info from '../icons/Info.jsx';

const OptimizationResultsModal = ({ 
  isOpen, 
  onClose, 
  results, 
  onGenerateReport,
  formulation,
  goToPercent
}) => {
  const [detailedIngredients, setDetailedIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Toggle between 'simple' (Breakdown) and 'detailed' (Nutrient Table)
  const [viewMode, setViewMode] = useState('simple'); 

  useEffect(() => {
    const fetchIngredientDetails = async () => {
      if (!isOpen || !results?.ingredients) return;
      
      setIsLoading(true);
      try {
        const ids = formulation.ingredients.map(ing => ing.ingredient_id || ing._id);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/ingredient/idarray`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });

        const data = await response.json();
        if (data.message === 'success') {
          setDetailedIngredients(data.ingredients);
        }
      } catch (error) {
        console.error("Error fetching ingredient details:", error);
      } finally {
        console.log("DETAILED INGREDIENTS", detailedIngredients)
        setIsLoading(false);
      }
    };

    fetchIngredientDetails();
  }, [isOpen, results, formulation]);

  if (!isOpen || !results) return null;

  const formatNum = (val, decimals = 2) => Number(val || 0).toFixed(decimals);

  /**
   * Logic: (Weight * DM%) * Nutrient%
   * Last element is always treated as the multiplier for others
   */
  const getIngredientContribution = (ingredientId, weightInGrams, nutrientTargetId, ing, unit = 'grams') => {
    const ingredientData = detailedIngredients.find(item => item._id === ingredientId);
    if (!ingredientData || !ingredientData.nutrients) return 0;

    const lastNutrient = formulation.nutrients[formulation.nutrients.length - 1];
    const dmTargetId = lastNutrient._id || lastNutrient.id;

    const currentNutrientEntry = ingredientData.nutrients.find(n => n.nutrient === nutrientTargetId);
    const dmEntry = ingredientData.nutrients.find(n => n.nutrient === dmTargetId);
    
    if (!currentNutrientEntry) return 0;

    const weightKg = Number(weightInGrams) / 1000;
    const dmPercentage = Number(dmEntry?.value || 0);
    const dryMatterKg = weightKg * dmPercentage;

    if (nutrientTargetId === dmTargetId) {
      return dryMatterKg * 1000; 
    }

    return dryMatterKg * Number(currentNutrientEntry.value || 0) * 1000;
  };

  const getAchievedTotal = (nutrientList, targetName) => {
    if (!nutrientList || !Array.isArray(nutrientList)) return 0;
    const n = nutrientList.find(nut => nut.name?.toLowerCase().includes(targetName.toLowerCase()));
    return n ? Number(n.value || 0) : 0;
  };

  const getExpectedTarget = (nutrientList, targetName) => {
    if (!nutrientList || !Array.isArray(nutrientList)) return 0;
    const n = nutrientList.find(nut => nut.name?.toLowerCase().includes(targetName.toLowerCase()));
    return n ? (Number(n.minimum || 0) + Number(n.maximum || 0)) / 2 : 0;
  };

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''} z-[999]`}>
      <div className="modal-box relative w-11/12 max-w-4xl rounded-3xl bg-white md:mt-0 shadow-2xl p-5 md:p-6 no-scrollbar">
        <button className="btn btn-sm btn-circle absolute top-4 right-4 z-10" onClick={onClose}>
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-1 text-lg font-bold">Feed Formulation</h3>

        {/* STEP PROGRESS BAR */}
        <div className="flex flex-row items-center space-x-2 md:space-x-4 mb-6 overflow-x-auto no-scrollbar pb-1 text-deepbrown">
          <div className="flex items-center gap-2 shrink-0 opacity-60">
            <h1 className="text-gray-400 text-[10px] md:text-sm font-bold uppercase tracking-wider">Select/Create</h1>
            <RiArrowRightSLine className="text-gray-300 h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-start md:items-center">
              <h1 className="text-deepbrown text-[10px] md:text-sm font-bold uppercase tracking-wider">Formulate</h1>
              <div className="h-1 w-full bg-deepbrown rounded-full mt-0.5 animate-pulse" />
            </div>
            <RiArrowRightSLine className="text-deepbrown h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div className="flex items-center gap-2 shrink-0 opacity-60 text-gray-400 text-[10px] md:text-sm font-bold uppercase tracking-wider">Generate</div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-50 border border-gray-100 p-3 md:p-4 rounded-2xl">
            <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 tracking-widest block mb-1">Total Weight</span>
            <p className="text-lg md:text-2xl font-bold text-deepbrown leading-none">
              {formatNum(results.totalWeight)} <span className="text-xs font-normal">kg</span>
            </p>
          </div>
          <div className="bg-green-50 border border-green-100 p-3 md:p-4 rounded-2xl">
            <span className="text-[9px] md:text-[10px] uppercase font-bold text-green-600 tracking-widest block mb-1">Calculated Cost</span>
            <p className="text-lg md:text-2xl font-bold text-green-700 leading-none">₱{formatNum(results.totalCost)}</p>
          </div>
        </div>

        {/* VIEW TOGGLE */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 italic">
            <Info className="shrink-0" />
            <span>{isLoading ? 'Loading data...' : 'Optimization complete.'}</span>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('simple')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'simple' ? 'bg-white shadow-sm text-deepbrown' : 'text-gray-400'}`}
            >
              <RiLayoutGridLine /> BREAKDOWN
            </button>
            <button 
              onClick={() => setViewMode('detailed')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'detailed' ? 'bg-white shadow-sm text-deepbrown' : 'text-gray-400'}`}
            >
              <RiTableLine /> NUTRIENTS
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="max-h-64 overflow-auto rounded-2xl border border-gray-100 shadow-sm no-scrollbar">
            
            {viewMode === 'simple' ? (
              /* --- VERSION 1: SIMPLE INGREDIENT LIST --- */
              <table className="table table-xs md:table-sm w-full">
                <thead className="sticky top-0 bg-gray-50 text-gray-500 z-10">
                  <tr className="uppercase text-[10px]">
                    <th className="py-3 px-4 text-left">Ingredient Name</th>
                    <th className="text-right py-3 px-4">Amount (KG AS-FED)</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] md:text-sm">
                  {results.ingredients.map((ing, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-700 font-medium">{ing.name}</td>
                      <td className="text-right py-3 px-4 font-mono font-bold text-deepbrown">
                        {formatNum(Number(ing.value) / 1000, 3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* --- VERSION 2: DETAILED NUTRIENT TABLE --- */
              <table className="table table-xs md:table-sm w-full text-center">
                <thead className="sticky top-0 bg-gray-50 text-gray-500 z-10 border-b">
                  <tr className="uppercase text-[9px] md:text-[10px]">
                    <th className="text-left py-3 px-4 sticky left-0 bg-gray-50 z-20 shadow-sm">Ingredient</th>
                    <th>kg/animal per day</th>
                    {formulation.nutrients.find(nut => nut.name === "Dry Matter") && (
                      <th>Dry Matter (kg)</th>
                    )}
                    {formulation.nutrients.map((nut, i) => (
                      nut.name !== "Dry Matter" && (
                        nut.name === "Total Digestible Nutrients" ?
                        <th key={i}>{nut.name} (kg)</th> :
                        <th key={i}>{nut.name} (g)</th>
                      )
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[11px] md:text-sm">
                  {results.ingredients.map((ing, idx) => {
                    const ingredientData = detailedIngredients.find(
                      (item) => (item._id === ing.ingredient_id) || (item.name === ing.name)
                    );

                    return (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2 px-4 text-left text-gray-700 font-medium sticky left-0 bg-white z-10 border-r">
                          {ing.name}
                        </td>
                        <td className="font-mono font-bold text-deepbrown">
                          {formatNum(ing.value / 1000, 3)} kg
                        </td>
                        {formulation.nutrients.find(nut => nut.name === "Dry Matter") && (
                          <td className="text-gray-500 font-mono">
                            {formatNum(getIngredientContribution(
                              ingredientData?._id, 
                              ing.value, 
                              formulation.nutrients.find(n => n.name === "Dry Matter").nutrient_id || formulation.nutrients.find(n => n.name === "Dry Matter")._id, 
                              ingredientData,
                              "kilograms"
                            ) / 1000, 2)} kg
                          </td>
                        )}
                        {formulation.nutrients.map((nut) => 
                          nut.name !== "Dry Matter" && (
                            nut.name === "Total Digestible Nutrients" ?
                            <td key={nut._id} className="text-gray-500 font-mono">
                              {formatNum(getIngredientContribution(
                                ingredientData?._id, 
                                ing.value, 
                                nut.nutrient_id || nut._id, 
                                ingredientData,
                                "kilograms"
                              ) / 1000, 2)} kg
                            </td> :
                            <td key={nut._id} className="text-gray-500 font-mono">
                              {formatNum(getIngredientContribution(
                                ingredientData?._id, 
                                ing.value, 
                                nut.nutrient_id || nut._id, 
                                ingredientData,
                                "grams"
                              ), 2)} g
                            </td>
                          )
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-amber-50 font-bold border-t-2 border-amber-100">
                    <td className="sticky left-0 bg-amber-50 z-10 text-left px-4">TOTAL</td>
                    <td className="font-mono text-amber-700">{formatNum(results.totalWeight, 2)} kg</td>
                    {formulation.nutrients.find(nut => nut.name === "Dry Matter") && (
                      <td className="font-mono text-amber-700">{formatNum(getAchievedTotal(results.nutrients, "Dry Matter") / 1000, 2)} kg</td>
                    )}
                    {formulation.nutrients.map((nut, i) =>
                      nut.name !== "Dry Matter" && (
                        nut.name === "Total Digestible Nutrients" ?
                        <td key={i} className="font-mono text-amber-700">{formatNum(getAchievedTotal(results.nutrients, nut.name) / 1000, 2)} kg</td> :
                        <td key={i} className="font-mono text-amber-700">{formatNum(getAchievedTotal(results.nutrients, nut.name), 2)} g</td>
                      )
                    )}
                  </tr>
                  <tr className="bg-amber-500 font-bold text-white">
                    <td className="sticky left-0 bg-amber-500 z-10 text-left px-4">REQ.</td>
                    <td className="font-mono">{formatNum(results.totalWeight, 2)} kg</td>
                    {formulation.nutrients.find(nut => nut.name === "Dry Matter") && (
                      <td className="font-mono">{formatNum(getExpectedTarget(formulation.nutrients, "Dry Matter") / 1000, 2)} kg</td>
                    )}
                    {formulation.nutrients.map((nut, i) =>
                      nut.name !== "Dry Matter" && (
                        nut.name === "Total Digestible Nutrients" ?
                        <td key={i} className="font-mono">{formatNum(getExpectedTarget(formulation.nutrients, nut.name) / 1000, 2)} kg</td> :
                        <td key={i} className="font-mono">{formatNum(getExpectedTarget(formulation.nutrients, nut.name), 2)} g</td>
                      )
                    )}
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end mt-4">
          <button className="btn btn-ghost md:btn-outline rounded-xl px-8 border-gray-200 text-gray-500 h-10 min-h-0" onClick={onClose}>
            Back to Editor
          </button>
          <button className="btn bg-green-button hover:bg-green-600 rounded-xl px-8 text-white flex gap-2 items-center justify-center h-10 min-h-0 border-none shadow-lg" onClick={onGenerateReport}>
            Generate PDF Report <RiArrowRightSLine className="hidden md:block" />
          </button>
          <button className="btn bg-white hover:border-green hover:text-green-600 rounded-xl px-8 text-black flex gap-2 items-center justify-center h-10 min-h-0  shadow-lg" onClick={goToPercent}>
            Switch to Percent Mode <RiArrowRightSLine className="hidden md:block" />
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default OptimizationResultsModal;