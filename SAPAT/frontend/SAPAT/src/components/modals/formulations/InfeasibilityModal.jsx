import React from 'react';
import { RiCloseLine } from 'react-icons/ri';
// Adjust this import based on your translation library
import { useTranslation } from 'react-i18next';

function InfeasibilityModal({ isOpen, onClose, diagnosisData }) {
    const { t } = useTranslation();

    if (!isOpen || !diagnosisData) return null;``

    const handleSubstituteClick = (ingredientName) => {
        const searchQuery = encodeURIComponent(`${ingredientName} on carabao feed`);
        window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
    };

    const {
        priorityAdvice,
        suggestion,
        structuralIssues = [],
        nutrientIssues = [],
        smartIngredientSuggestions = [],
        ispercent
    } = diagnosisData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-3xl overflow-hidden bg-white shadow-2xl rounded-2xl sm:rounded-3xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">

            <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 text-gray-500 transition-colors bg-white/80 backdrop-blur-md rounded-full hover:bg-gray-100 hover:text-black"
            aria-label={t("Close")}
            >
            <RiCloseLine className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Header */}
            <div className="bg-amber-50/50 p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t("No feasible formula found")}</h2>
            </div>
            <p className="text-sm text-gray-500 ml-11">{t("Your current constraints cannot produce a valid diet. Review the issues below.")}</p>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">

            {/* Priority advice banner */}
            {priorityAdvice && (
                <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-4">
                <p className="text-xs font-semibold text-red-800 uppercase tracking-wider mb-1">{t("Priority advice")}</p>
                <p className="text-sm text-red-900 mb-1">{t(priorityAdvice)}</p>
                {suggestion && <p className="text-xs text-red-700">{t(suggestion)}</p>}
                </div>
            )}

            {/* Structural issues */}
            {structuralIssues.length > 0 && (
                <div>
                <h3 className="text-base font-bold text-gray-800 mb-3">{t("Structural issues")}</h3>
                <div className="flex flex-col gap-2">
                    {structuralIssues.map((issue, idx) => (
                    <div key={idx} className="bg-gray-50/80 border border-gray-100 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            {issue.type ? t(issue.type.replace(/_/g, ' ')) : ''}
                        </span>
                        {issue.severity === 'critical' && (
                            <span className="text-[11px] font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                            {t("critical")}
                            </span>
                        )}
                        </div>
                        <p className="text-sm text-gray-800 mb-1">{t(issue.message)}</p>
                        <p className="text-xs text-gray-500">{t(issue.recommendation)}</p>
                    </div>
                    ))}
                </div>
                </div>
            )}

            {/* Nutrient shortages */}
            {nutrientIssues.length > 0 && (
                <div>
                <h3 className="text-base font-bold text-gray-800 mb-3">{t("Nutrient shortages")}</h3>
                <div className="flex flex-col gap-2">
                    {nutrientIssues.map((gap, idx) => {
                    const pct = gap.required > 0
                        ? Math.min(100, Math.round((gap.maxPossible / gap.required) * 100))
                        : 0;
                    return (
                        <div key={idx} className="bg-gray-50/80 border border-gray-100 rounded-xl p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{t(gap.nutrient)}</span>
                            <span className="text-[11px] font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {t("shortage:")} {gap.shortage?.toLocaleString()}g
                            </span>
                        </div>
                        <div className="flex gap-4 mb-3 text-xs">
                            <div>
                            <p className="text-gray-400">{t("Required")}</p>
                            <p className="font-semibold text-gray-700">{gap.required?.toLocaleString()} {ispercent ? 'g' : 'g'}</p>
                            </div>
                            <div>
                            <p className="text-gray-400">{t("Max possible")}</p>
                            <p className="font-semibold text-gray-700">{gap.maxPossible?.toLocaleString()} {ispercent ? 'g' : 'g'}</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-full h-1.5 overflow-hidden mb-1">
                            <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-400">{pct}% {t("of requirement achievable")}</p>
                        </div>
                    );
                    })}
                </div>
                </div>
            )}

            {/* Ingredient suggestions */}
            {smartIngredientSuggestions.length > 0 && (
                <div>
                <h3 className="text-base font-bold text-gray-800 mb-1">{t("Suggested ingredients (Press ingredient to search in internet)")}</h3>
                <p className="text-xs text-gray-400 italic mb-3">
                    {t("If the constraints cannot be modified further, here are suggested ingredients to fill the shortage — review their nutritional profiles before adding them to your formulation.")}
                </p>
                <div className="flex flex-col gap-3">
                    {smartIngredientSuggestions.map((sug, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="bg-amber-50/60 px-4 py-2.5 border-b border-gray-100 flex justify-between items-center flex-wrap gap-1">
                        <span className="text-xs font-semibold text-amber-800">
                            {t("For")} {t(sug.nutrient)}
                        </span>
                        <span className="text-[11px] text-gray-400">{t("shortage:")} {sug.shortage?.toLocaleString()}g</span>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-2">{t("Ingredient")}</th>
                                <th className="px-4 py-2">{t("Group")}</th>
                                <th className="px-4 py-2 text-right">{t(sug.nutrient).split(' ').map(w => w[0]).join('')}%</th>
                                <th className="px-4 py-2 text-right">{t("Price")}</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 ">
                            {sug.recommended?.map((ing, i) => (
                                <tr key={i} className="hover:bg-amber-100/50 transition-colors cursor-pointer" onClick={() => handleSubstituteClick(ing.name)}>
                                <td className="px-4 py-2.5 font-medium text-gray-800">{t(ing.name)}</td>
                                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{t(ing.group)}</td>
                                <td className="px-4 py-2.5 text-right text-gray-700">{ing.nutrientPercentage ?? ((ing.nutrientContent * 100).toFixed(1))}%</td>
                                <td className="px-4 py-2.5 text-right font-medium text-gray-700">₱{ing.price}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            )}

            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 flex justify-end">
            <button
                onClick={onClose}
                className="px-5 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-semibold text-white transition-all rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-lg shadow-amber-200"
            >
                {t("Close")}
            </button>
            </div>
        </div>

        <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}

export default InfeasibilityModal;