import { useEffect, useState, React } from 'react';
import { RiCloseLine, RiArrowRightSLine } from 'react-icons/ri';
import Info from '../icons/Info.jsx';

const ManualFormulationTable = ({ 
  isOpen, 
  onClose, 
  results, 
  onGenerateReport,
  formulation
}) => {
  const [detailedIngredients, setDetailedIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
        setIsLoading(false);
      }
    };

    fetchIngredientDetails();
  }, [isOpen, results, formulation]);

  if (!isOpen || !results) return null;

  const formatNum = (val, decimals = 2) => Number(val || 0).toFixed(decimals);

  const getIngredientContribution = (ingredientId, weightInGrams, nutrientTargetId) => {
    const ingredientData = detailedIngredients.find(item => item._id === ingredientId);
    if (!ingredientData || !ingredientData.nutrients) return 0;

    const lastNutrient = formulation.nutrients[formulation.nutrients.length - 1];
    const dmTargetId = lastNutrient._id || lastNutrient.id;

    const currentNutrientEntry = ingredientData.nutrients.find(n => n.nutrient === nutrientTargetId);
    const dmEntry = ingredientData.nutrients.find(n => n.nutrient === dmTargetId);
    
    if (!currentNutrientEntry) return 0;

    const weightKg = Number(weightInGrams) / 1000;
    const dmPercentage = Number(dmEntry?.value || 0) / 100;
    const dryMatterKg = weightKg * dmPercentage;

    if (nutrientTargetId === dmTargetId) return dryMatterKg * 1000; 

    return dryMatterKg * (Number(currentNutrientEntry.value || 0) / 100) * 1000;
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
      <div className="modal-box relative w-11/12 max-w-6xl rounded-3xl bg-white shadow-2xl p-6 no-scrollbar">
        <button className="btn btn-sm btn-circle absolute top-4 right-4 z-10" onClick={onClose}>
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-4 text-lg font-bold">Manual Formulation Results</h3>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block mb-1">Total Weight</span>
            {/* Displaying Total Weight in Grams here */}
            <p className="text-2xl font-bold text-deepbrown">{formatNum(results.totalWeight * 1000, 0)} <span className="text-xs font-normal">g</span></p>
          </div>
          <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-green-600 tracking-widest block mb-1">Total Cost</span>
            <p className="text-2xl font-bold text-green-700">₱{formatNum(results.totalCost)}</p>
          </div>
        </div>

        {/* NUTRIENT TABLE */}
        <div className="max-h-[500px] overflow-auto rounded-2xl border border-gray-100 shadow-sm no-scrollbar mb-6">
          <table className="table table-xs md:table-sm w-full text-center border-separate border-spacing-0">
            <thead className="sticky top-0 bg-gray-50 text-gray-500 z-30">
              <tr className="uppercase text-[10px]">
                <th className="text-left py-4 px-4 sticky left-0 bg-gray-50 z-40 border-b border-r">Ingredient</th>
                <th className="border-b">g/animal</th>
                {formulation.nutrients.map((nut, i) => (
                  <th key={i} className="border-b">{nut.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[11px] md:text-sm">
              {results.ingredients.map((ing, idx) => {
                const ingredientData = detailedIngredients.find(
                  (item) => (item._id === ing.ingredient_id) || (item.name === ing.name)
                );

                return (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-left text-gray-700 font-bold sticky left-0 bg-white z-10 border-r border-b">
                      {ing.name}
                    </td>
                    <td className="font-mono font-bold text-deepbrown border-b">
                      {formatNum(ing.value)}
                    </td>
                    {formulation.nutrients.map((nut) => (
                      <td key={nut._id} className="text-gray-500 font-mono border-b">
                        {formatNum(getIngredientContribution(
                          ingredientData?._id, 
                          ing.value, 
                          nut.nutrient_id || nut._id
                        ))}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* TOTAL ACHIEVED ROW */}
              <tr className="bg-amber-50 font-bold text-deepbrown">
                <td className="sticky left-0 bg-amber-50 z-10 text-left px-4 border-r border-t-2 border-amber-100">TOTAL ACHIEVED</td>
                <td className="font-mono border-t-2 border-amber-100">{formatNum(results.totalWeight * 1000, 0)}</td>
                {formulation.nutrients.map((nut, i) => (
                  <td key={i} className="font-mono border-t-2 border-amber-100">
                    {formatNum(getAchievedTotal(results.nutrients, nut.name))}
                  </td>
                ))}
              </tr>

              {/* EXPECTED REQUIREMENTS ROW */}
              <tr className="bg-amber-500 font-bold text-white">
                <td className="sticky left-0 bg-amber-500 z-10 text-left px-4 border-r">EXPECTED REQ.</td>
                <td className="font-mono">{formatNum(results.totalWeight * 1000, 0)}</td>
                {formulation.nutrients.map((nut, i) => (
                  <td key={i} className="font-mono">
                    {formatNum(getExpectedTarget(formulation.nutrients, nut.name))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-gray-400 italic">
            <Info size={14} />
            <span>Comparison based on target nutrient constraints.</span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost rounded-xl px-8" onClick={onClose}>
              Back to Editor
            </button>
            <button className="btn bg-green-600 hover:bg-green-700 border-none rounded-xl px-8 text-white shadow-lg" onClick={onGenerateReport}>
              Generate PDF Report <RiArrowRightSLine />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

export default ManualFormulationTable;