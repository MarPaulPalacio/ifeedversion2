import React from 'react';
import { RiCloseLine, RiArrowRightSLine, RiCheckLine } from 'react-icons/ri';
import Info from '../icons/Info.jsx';

const OptimizationResultsModal = ({ 
  isOpen, 
  onClose, 
  results, 
  onGenerateReport 
}) => {
  if (!isOpen || !results) return null;

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''} z-[999]`}>
      <div className="modal-box relative  w-11/12 max-w-2xl rounded-3xl bg-white md:mt-0 shadow-2xl p-5 md:p-6">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle absolute top-4 right-4 z-10"
          onClick={onClose}
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-1 text-lg font-bold">
          Feed Formulation
        </h3>

        {/* STEP PROGRESS BAR */}
        <div className="flex flex-row items-center space-x-2 md:space-x-4 mb-6 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-2 shrink-0 opacity-60">
            <h1 className="text-gray-400 text-[10px] md:text-sm font-bold uppercase tracking-wider">
              Select/Create
            </h1>
            <RiArrowRightSLine className="text-gray-300 h-4 w-4 md:h-5 md:w-5" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-start md:items-center">
              <h1 className="text-deepbrown text-[10px] md:text-sm font-bold uppercase tracking-wider">
                Formulate
              </h1>
              <div className="h-1 w-full bg-deepbrown rounded-full mt-0.5 animate-pulse" />
            </div>
            <RiArrowRightSLine className="text-deepbrown h-4 w-4 md:h-5 md:w-5" />
          </div>

          <div className="flex items-center gap-2 shrink-0 opacity-60">
            <h1 className="text-gray-400 text-[10px] md:text-sm font-bold uppercase tracking-wider">
              Generate
            </h1>
          </div>
        </div>

        <p className="mb-6 flex items-start gap-2 text-xs md:text-sm text-gray-500 italic leading-tight">
          <Info className="shrink-0 mt-0.5" />
          <span>Optimization successful. Review results before report generation.</span>
        </p>

        {/* Results Summary Cards - Optimized 2-column for mobile */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-50 border border-gray-100 p-3 md:p-4 rounded-2xl">
            <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 tracking-widest block mb-1">Total Weight</span>
            <p className="text-lg md:text-2xl font-bold text-deepbrown leading-none">
              {results.totalWeight} <span className="text-xs font-normal">kg</span>
            </p>
          </div>
          <div className="bg-green-50 border border-green-100 p-3 md:p-4 rounded-2xl">
            <span className="text-[9px] md:text-[10px] uppercase font-bold text-green-600 tracking-widest block mb-1">Calculated Cost</span>
            <p className="text-lg md:text-2xl font-bold text-green-700 leading-none">
              ₱{results.totalCost.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Ingredient Breakdown Table */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 px-1">
            <h4 className="font-bold text-xs md:text-sm text-deepbrown">Ingredients</h4>
            <span className="text-[9px] text-gray-400 font-mono">KG (AS-FED)</span>
          </div>
          <div className="max-h-48 md:max-h-60 overflow-y-auto rounded-2xl border border-gray-100 shadow-sm no-scrollbar">
            <table className="table table-xs md:table-sm w-full">
              <thead className="sticky top-0 bg-gray-50 text-gray-500 z-10">
                <tr>
                  <th className="py-2 font-bold uppercase text-[9px] md:text-[10px]">Name</th>
                  <th className="text-right py-2 font-bold uppercase text-[9px] md:text-[10px]">Amount</th>
                </tr>
              </thead>
              <tbody className="text-[11px] md:text-sm">
                {results.ingredients.map((ing, idx) => (
                  <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-2 text-gray-700 font-medium truncate max-w-[120px]">{ing.name}</td>
                    <td className="text-right py-2 font-mono font-bold text-deepbrown">
                      {(Number(ing.value) / 1000).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal actions - Vertical stack on mobile */}
        <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end mt-4">
          <button
            type="button"
            className="btn btn-ghost md:btn-outline rounded-xl px-8 border-gray-200 text-gray-500 md:text-current h-10 min-h-0"
            onClick={onClose}
          >
            Back to Editor
          </button>
          <button
            type="button"
            className="btn bg-green-button hover:bg-green-600 rounded-xl px-8 text-white flex gap-2 items-center justify-center h-10 min-h-0"
            onClick={onGenerateReport}
          >
            Generate PDF Report <RiArrowRightSLine className="hidden md:block" />
          </button>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop bg-black/40 backdrop-blur-[2px]">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};

export default OptimizationResultsModal;