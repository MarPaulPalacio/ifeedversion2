import { useState, useRef, useEffect } from "react";
import { RiCalculatorLine } from "react-icons/ri";

export default function OptimizeFAB({ handleOptimize }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ✅ Detect outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} className="md:hidden">
      
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="
          btn bg-green-button border-none text-white shadow-lg
          fixed bottom-24 right-6 z-[200]
          rounded-full p-3 w-13 h-13 opacity-50
        "
      >
        <RiCalculatorLine className="w-8 h-8" />
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          className="
            menu bg-base-100 rounded-box shadow-xl border border-base-200
            fixed bottom-40 right-6 z-[200] w-52 p-2
          "
        >
          <li>
            <button
              className="py-2.5 text-xs"
              onClick={() => {
                handleOptimize("simplex");
                setOpen(false); // 👈 close after click
              }}
            >
              Simplex Feed Ratio
            </button>
          </li>
          <li>
            <button
              className="py-2.5 text-xs"
              onClick={() => {
                handleOptimize("simplex-dry-matter");
                setOpen(false);
              }}
            >
              Simplex Dry Matter
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}