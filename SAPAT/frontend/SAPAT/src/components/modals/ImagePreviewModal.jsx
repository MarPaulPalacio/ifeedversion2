import { RiCloseLine } from 'react-icons/ri';

function ImagePreviewModal({ isOpen, onClose, imageUrl, name, description }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden bg-white shadow-2xl rounded-3xl animate-in fade-in zoom-in duration-200">
        
        {/* Upper Close Icon (Standard UX) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-500 transition-colors bg-white/80 backdrop-blur-md rounded-full hover:bg-gray-100 hover:text-black"
        >
          <RiCloseLine className="w-6 h-6" />
        </button>

        {/* Content Area */}
        <div className="flex flex-col">
          {/* Image Section */}
          <div className="w-full bg-gray-100 aspect-video">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={name} 
                className="object-cover w-full h-full"
                onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=Image+Not+Available'; }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No Image provided</div>
            )}
          </div>

          {/* Text Section */}
          <div className="p-6 pb-20"> {/* Bottom padding reserved for the button */}
            <h2 className="text-2xl font-bold text-gray-800">{name || "Ingredient Name"}</h2>
            <div className="mt-3 text-gray-600 leading-relaxed">
              {description ? (
                <p>{description}</p>
              ) : (
                <p className="italic text-gray-400">No description available for this ingredient.</p>
              )}
            </div>
          </div>
        </div>

        {/* Lower Right Close Button */}
        <div className="absolute bottom-6 right-6">
          <button
            onClick={onClose}
            className="px-6 py-2 font-semibold text-white transition-all rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-lg shadow-amber-200"
          >
            Close
          </button>
        </div>
      </div>

      {/* Backdrop Click to Close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
}

export default ImagePreviewModal;