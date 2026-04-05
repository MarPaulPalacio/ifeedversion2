import { useState } from 'react'
import { RiPencilLine, RiDeleteBinLine, RiTableLine } from 'react-icons/ri'
import { FaEye } from 'react-icons/fa'
import useAuth from '../hook/useAuth'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion' // Added Framer Motion

function Table({
  headers,
  data,
  page,
  onEdit,
  onDelete,
  onRowClick,
  actions = true,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
  }

  const checkNeedsUpdate = (lastUpdated, row) => {
    if (!lastUpdated) return false
    const updated = new Date(lastUpdated)
    const today = new Date()
    const daysPassed = Math.floor((today - updated) / (1000 * 60 * 60 * 24))

    const groupsRequiringMonthly = [
      "Senior Bull | Bulugan (> 3 taon)",
      "Junior Bull | Lumalaking bulugan (2 - 3 taon)",
      "Growing Calves (5-12 months) | Lumalaking bula (5 - 12 buwan)"
    ];

    if (groupsRequiringMonthly.includes(row.animal_group)) {
      return daysPassed >= 31
    }
    return daysPassed >= 2
  }

  const getRowData = (row) => {
    if (!row) return []
    if (page === 'formulations') {
      return ['code', 'name', 'description', 'animal_group', 'access'].map(f => row[f] || t('N/A'))
    } else if (page === 'ingredients') {
      const rowData = ['name', 'price', 'available', 'group', 'description'].map(f => row[f] || t('N/A'))
      rowData[2] = Number(rowData[2]) === 1 ? t('Yes') : t('No')
      return rowData
    } else if (page === 'nutrients') {
      return ['abbreviation', 'name', 'unit', 'description', 'group'].map(f => row[f] || t('N/A'))
    } else if (page === 'groupformulations') {
      return [row.name || t('N/A'), row.description || t('N/A'), row.formulations?.length || 0]
    }
    return Object.values(row)
  }

  const handleRowClick = (row) => {
    if (!onRowClick) return;
    if (page === "ingredients" && row?.image?.url) {
      onRowClick(row.image.url, row.description, row.name);
    } else if (page !== "ingredients") {
      onRowClick(row);
    }
  };

  return (
    <div className="w-full">
      {/* --- MOBILE CARD VIEW --- */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 md:hidden"
      >
        <AnimatePresence mode='popLayout'>
          {data && data.length > 0 ? (
            data.map((row, rowIndex) => (
              <motion.div 
                layout
                key={row._id || rowIndex} 
                variants={rowVariants}
                whileTap={{ scale: 0.98 }}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleRowClick(row)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-deepbrown text-base flex items-center gap-2">
                      {row.name || row.abbreviation || 'N/A'}
                      {page === "ingredients" && row?.image?.url && <FaEye className="text-gray-400 h-3 w-3" />}
                    </h3>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">
                      {row.animal_group || row.group || (page === 'groupformulations' ? 'Group' : '')}
                    </p>
                  </div>
                  
                  {((actions && user?.userType === 'admin' && page !== "groupformulations") || (page==="formulations"))  && (


                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      
                      <button 
                        disabled={row?.access && row?.access !== 'owner'}
                        className={`btn btn-ghost btn-sm ${row?.access === 'owner' ? 'text-deepbrown' : 'text-gray-300'}`}
                        onClick={() => onEdit(row)}
                      >
                        <RiPencilLine size={16} />
                      </button>
                      <button 
                        disabled={row?.access && row?.access !== 'owner'}
                        className={`btn btn-ghost btn-sm ${row?.access === 'owner' ? 'text-deepbrown' : 'text-gray-300'}`}
                        onClick={() => onDelete(row)}
                      >
                        <RiDeleteBinLine size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-600 line-clamp-2 mb-3 italic">
                  {row.description || 'No description provided.'}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                    {row.code || (page === 'groupformulations' ? `${row.formulations?.length} items` : '')}
                    {page === 'ingredients' && row.price ? `₱${row.price}` : ''}
                  </span>
                  {checkNeedsUpdate(row.lastUpdated, row) && (
                    <span className="text-[10px] text-yellow-600 font-bold flex items-center gap-1">
                      <span className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></span>
                      Needs Update
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div variants={rowVariants} className="text-center py-10 bg-white rounded-lg border">
              <RiTableLine className="mx-auto h-10 w-10 opacity-20" />
              <p className="text-gray-400 mt-2">No results found.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* --- DESKTOP TABLE VIEW --- */}
      {/* --- DESKTOP TABLE VIEW --- */}
<div className="hidden md:block rounded-lg bg-white shadow-sm border border-gray-100 overflow-x-auto overflow-y-visible">
  <table className="table table-md table-pin-rows w-full border-separate border-spacing-0">
    <thead className="bg-gray-50">
      <tr>
        {headers.map((header, index) => (
          <th key={index} className="text-deepbrown py-4 text-sm font-bold uppercase tracking-wider">
            {t(header)}
          </th>
        ))}
        {((actions && user?.userType === "admin" && page !== "groupformulations") || (actions && page === "formulations")) && (
          <th className="text-deepbrown text-right py-4 pr-6">{t('Actions')}</th>
        )}
      </tr>
    </thead>
    <motion.tbody 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <AnimatePresence mode='popLayout'>
        {data && data.length > 0 ? (
          data.map((row, rowIndex) => (
            <motion.tr 
              layout
              variants={rowVariants}
              key={row._id || rowIndex} 
              /* FIX: hover:relative and hover:z-50 forces the current row 
                to the front of the stacking context so tooltips show on top.
              */
              className="hover:bg-base-200 transition-colors hover:relative hover:z-50 group/row"
            >
              {getRowData(row)
                .map((cell, cellIndex) => ({ cell, cellIndex }))
                .filter(item => !(page === "ingredients" && item.cellIndex === 2))
                .map(({ cell, cellIndex }) => (
                  <td key={cellIndex} className="py-3 max-w-[150px] md:max-w-none">
                    {((onRowClick && cellIndex === 1 && page === "formulations") || 
                     (onRowClick && cellIndex === 0 && page === "groupformulations")) ? (
                      <div className="tooltip tooltip-right" data-tip="View">
                        <span
                          onClick={() => onRowClick(row)}
                          className="group text-deepbrown hover:bg-green-button inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-sm font-medium hover:text-white transition-all"
                        >
                          {cell}
                          <FaEye className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                      </div>
                    ) : 
                    (cellIndex === 0 && page === "ingredients" && row?.image?.url) ? (
                      <div className="tooltip tooltip-right" data-tip="View">
                        <span
                          onClick={() => onRowClick(row.image.url, row.description, row.name)}
                          className="group text-deepbrown hover:bg-green-button inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-sm font-medium hover:text-white transition-all"
                        >
                          {cell}
                          <FaEye className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className={`text-sm ${cellIndex === 0 && row?.lastUpdated && checkNeedsUpdate(row?.lastUpdated, row) ? 'border-yellow-500 p-0.5 rounded-sm border' : ''}`}>
                          {cell}
                        </span>
                        {cellIndex === 0 && checkNeedsUpdate(row?.lastUpdated, row) && (
                          /* FIX: Added tooltip-top/right and ensured z-index on the tooltip itself */
                          <div className="tooltip tooltip-top z-[60]" data-tip="Needs update">
                            <svg className="h-3 w-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                ))}

              {((actions && user?.userType === 'admin' && page !== "groupformulations") || (page==="formulations")) && (
                <td className="py-3 pr-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      disabled={row?.access && row?.access !== 'owner'}
                      className={`btn btn-ghost btn-sm ${row?.access === 'owner' ? 'text-deepbrown' : 'text-gray-300'}`}
                      onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                    >
                      <RiPencilLine size={18} />
                    </button>
                    <button
                      disabled={row?.access && row?.access !== 'owner'}
                      className={`btn btn-ghost btn-sm ${row?.access === 'owner' ? 'text-red-600' : 'text-gray-300'}`}
                      onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                    >
                      <RiDeleteBinLine size={18} />
                    </button>
                  </div>
                </td>
              )}
            </motion.tr>
          ))
        ) : (
          <motion.tr variants={rowVariants}>
            <td colSpan={10} className="py-10 text-center text-gray-500">
              <RiTableLine className="mx-auto mb-2 h-10 w-10 opacity-40" />
              <p className="text-sm">No results found.</p>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </motion.tbody>
  </table>
</div>
    </div>
  )
}

export default Table