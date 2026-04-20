import React from 'react';
import { RiCloseLine } from 'react-icons/ri';

function IngredientSubstituteModal({ isOpen, onClose, modalData, substitutesLoading }) {
  if (!isOpen) return null;

  const handleSubstituteClick = (ingredientName) => {
    const searchQuery = encodeURIComponent(`${ingredientName} on carabao feed`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden bg-white shadow-2xl rounded-2xl sm:rounded-3xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 text-gray-500 transition-colors bg-white/80 backdrop-blur-md rounded-full hover:bg-gray-100 hover:text-black"
        >
          <RiCloseLine className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex flex-col w-full overflow-y-auto">
          <div className="bg-amber-50/50 p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 pr-8 sm:pr-10">
              {modalData?.name || "Loading..."}
            </h2>
          </div>

          <div className="p-4 pb-20 sm:p-6 sm:pb-24"> 
            {substitutesLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm sm:text-base text-gray-500 font-medium animate-pulse text-center">Analyzing nutritional data & finding substitutes...</p>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                
                {modalData?.details && (
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Ingredient Information</h3>

                    

                    <div className="bg-gray-50/80 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm shadow-inner">
                      <div>
                        <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Group</span>
                        <span className="font-medium text-gray-700">{modalData.details.group || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</span>
                        <span className="font-medium text-gray-700">₱{modalData.details.price || '0.00'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</span>
                        <span className="font-medium text-gray-700 capitalize">{modalData.details.source || 'N/A'}</span>
                      </div>
                      <div className="col-span-1 sm:col-span-2 mt-1 sm:mt-2">
                        <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</span>
                        <span className="text-gray-600 leading-relaxed">
                          {modalData.details.description || <span className="italic text-gray-400">No description available.</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Top Nutritional Substitutes</h3>
                  <h4 className = "text-xs sm:text-base text-gray-500 mb-4 italic">
                    (Please note that these are not exact replacements and may require formulation adjustments. 
                    Also review the nutritional profiles to ensure they meet your specific requirements safely. Click on them to search about them on the internet.)
                  </h4>
                  {modalData?.substitutes?.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm">
                      <table className="min-w-full text-xs sm:text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100 whitespace-nowrap">
                          <tr>
                            <th className="px-4 py-3 sm:px-5 sm:py-4">Ingredient</th>
                            <th className="px-4 py-3 sm:px-5 sm:py-4">Group</th>
                            <th className="px-4 py-3 sm:px-5 sm:py-4">Price</th>
                            <th className="px-4 py-3 sm:px-5 sm:py-4">Match Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 whitespace-nowrap">
                          {modalData.substitutes.map((sub, idx) => (
                            <tr 
                              key={idx} 
                              onClick={() => handleSubstituteClick(sub.name)}
                              className="hover:bg-amber-100/50 cursor-pointer transition-colors group"
                              title={`Click to search about ${sub.name} on carabao feed`}
                            >
                              <td className="px-4 py-3 sm:px-5 sm:py-4 font-medium text-gray-800 group-hover:text-amber-700 transition-colors">
                                {sub.name}
                              </td>
                              <td className="px-4 py-3 sm:px-5 sm:py-4">{sub.group}</td>
                              <td className="px-4 py-3 sm:px-5 sm:py-4 font-medium">₱{sub.price}</td>
                              <td className="px-4 py-3 sm:px-5 sm:py-4">
                                <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold inline-flex items-center ${
                                  sub.matchPercentage >= 80 ? 'bg-green-100 text-green-700' : 
                                  sub.matchPercentage >= 60 ? 'bg-amber-100 text-amber-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {sub.matchPercentage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 text-center">
                      <p className="text-sm sm:text-base text-gray-500 italic">No close nutritional substitutes found in your database.</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 pointer-events-none">
          <button
            onClick={onClose}
            className="pointer-events-auto px-5 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-semibold text-white transition-all rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-lg shadow-amber-200"
          >
            Close
          </button>
        </div>
      </div>

      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
}

export default IngredientSubstituteModal;