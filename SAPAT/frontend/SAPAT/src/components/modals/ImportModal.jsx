import { RiCloseLine } from 'react-icons/ri'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

function ImportModal({ isOpen, onClose, onSubmit }) {
  const fileInputRef = useRef(null)
  const [fileDataInJSON, setFileDataInJSON] = useState([])
  const [fileValidationError, setFileValidationError] = useState('')
  const [foodType, setFoodType] = useState('')
  
  const NUTRIENT_MAP = {
    '% DM (as fed)': { name: 'Dry Matter', id: '69bba4f7d52f474e5c2b4bb6' }, 
    'CP (%)': { name: 'Crude Protein', id: '686b6f6dccb036a91ed43748' },
    'Ca (%)': { name: 'Calcium', id: '68e0d713dc9069077cf61d23' },
    'P (%)': { name: 'Phosphorus', id: '68e0d721dc9069077cf61d43' },
    'TDN (%)': { name: 'Total Digestible Nutrients', id: '686b6f6dccb036a91ed4373c' }
  }

  const parseNutrientValue = (val) => {
    if (val === undefined || val === null || val === '') return 0
    if (typeof val === 'number') return val / 100
    const stringVal = String(val).trim()

    if (stringVal.includes('-')) {
      const parts = stringVal.split('-').map(Number)
      const avg = (parts[0] + parts[1]) / 2
      return isNaN(avg) ? 0 : avg / 100
    }
    
    const num = Number(stringVal)
    return isNaN(num) ? 0 : num / 100
  }

  const transformExcelData = (jsonData) => {
    const foodType = String(jsonData[0][0] || 'Uncategorized').trim()
    setFoodType(foodType)
    
    const headers = jsonData[1]

    return jsonData.slice(2)
    .filter(row => row[0]) 
    .map((row) => {
      const nutrients = []
      let imageUrl = '' // Temporary variable to store the link

      headers.forEach((header, index) => {
        const cleanHeader = String(header || '').trim()
        
        // Check for Nutrient Data
        const nutrientConfig = NUTRIENT_MAP[cleanHeader]
        if (nutrientConfig) {
          nutrients.push({
            nutrient_id: nutrientConfig.id,
            nutrient: nutrientConfig.name,
            value: parseNutrientValue(row[index])
          })
        }

        // --- ADDED: Check for Picture Link Column ---
        if (cleanHeader === 'Picture Link') {
          imageUrl = String(row[index] || '').trim()
        }
      })

      return {
        name: row[0],
        category: foodType,
        price: 10,
        nutrients: nutrients,
        // Match your new Mongoose Schema structure
        image: {
          url: imageUrl,
          public_id: '' // Leave empty for manual Excel imports
        }
      }
    })
  }

  const handleChange = (e) => {
    setFileValidationError('')
    setFileDataInJSON([])

    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
        })

        if (jsonData.length < 3) {
          setFileValidationError('File must contain Title, Header, and at least one data row.')
          return
        }

        const headers = jsonData[1].map(h => String(h).trim())
        const hasRequiredColumns = Object.keys(NUTRIENT_MAP).some(req => headers.includes(req))

        if (!hasRequiredColumns) {
          setFileValidationError("Could not find nutrient columns in the header row. Check the second row of your sheet.")
          return
        }

        const formattedData = transformExcelData(jsonData)
        setFileValidationError('')
        setFileDataInJSON(formattedData)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  return (
    <dialog id="import_modal" className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box relative mt-[64px] w-11/12 max-w-md rounded-3xl bg-white md:mt-0">
        <button
          className="btn btn-sm btn-circle absolute top-4 right-4"
          onClick={() => {
            if (fileInputRef.current) fileInputRef.current.value = null
            setFileValidationError('')
            onClose()
          }}
        >
          <RiCloseLine className="h-5 w-5" />
        </button>

        <h3 className="text-deepbrown mb-2 text-lg font-bold">Import Feed Library</h3>
        <p className="text-sm text-gray-500 mb-4">
  Press{' '}
  <a
    href="https://docs.google.com/spreadsheets/d/1VPjZzv7dhXBmVn-sjePPzCMuuFLx7V2UmRUYDQOoWXo/edit?gid=1956754444#gid=1956754444"
    target="_blank"
    rel="noopener noreferrer"
    className="text-green-600 underline hover:text-green-700"
  >
    link here
  </a>{' '}
  for sample format.
</p>

        <div className="flex py-4">
          <fieldset className="w-full">
            <input
              type="file"
              accept=".xlsx, .xls"
              className={`file-input w-full ${fileValidationError ? 'file-input-error' : 'file-input-warning'}`}
              ref={fileInputRef}
              onChange={handleChange}
            />
            {fileValidationError && (
              <p className="mt-1 text-sm text-red-500" role="alert">
                {fileValidationError}
              </p>
            )}
          </fieldset>
        </div>

        <div className="modal-action">
          <button
            className="btn rounded-xl px-8"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = null
              setFileValidationError('')
              setFileDataInJSON([])
              onClose()
            }}
          >
            Cancel
          </button>
          <button
            disabled={fileDataInJSON.length === 0 || fileValidationError !== ''}
            className="btn btn-warning rounded-xl px-8 text-white hover:bg-amber-600"
            onClick={() => {
              onSubmit(fileDataInJSON, foodType)
              onClose()
            }}
          >
            Import ({fileDataInJSON.length} items)
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}

export default ImportModal