import { RiCloseLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'

function ViewFormulationsModal({ isOpen, onClose, formulations }) {
  const [filteredFormulations, setFilteredFormulations] = useState([])

  useEffect(() => {
    setFilteredFormulations(formulations || [])
  }, [formulations])

  return (
    <dialog
      id="view_formulations_modal"
      className={`modal ${isOpen ? 'modal-open' : ''}`}
    >
      <div className="modal-box relative mt-[64px] w-11/12 max-w-3xl rounded-3xl bg-white md:mt-0">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle absolute top-4 right-4"
          onClick={onClose}
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-4 text-lg font-bold">
          Formulations
        </h3>

        {/* Formulations table */}
        <div className="max-h-64 overflow-hidden overflow-y-auto rounded-2xl border border-gray-200">
          <table className="table w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="font-semibold">Name</th>
                <th className="font-semibold">Description</th>
                <th className="font-semibold">Weight</th>
              </tr>
            </thead>
            <tbody>
              {filteredFormulations.length > 0 ? (
                filteredFormulations.map((formulation, index) => (
                  <tr key={index} className="hover bg-gray-50">
                    <td>{formulation.name}</td>
                    <td>{formulation.description}</td>
                    <td>{formulation.weight}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="py-4 text-center text-gray-500">
                    No formulations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Close button at bottom */}
        <div className="modal-action mt-4">
          <button
            type="button"
            className="btn rounded-xl px-8"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}

export default ViewFormulationsModal