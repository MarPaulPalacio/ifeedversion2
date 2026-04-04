function Pagination({ paginationInfo, onPageChange }) {
  const { page, totalPages } = paginationInfo

  const goToPrev = () => { if (page > 1) onPageChange(page - 1) }
  const goToNext = () => { if (page < totalPages) onPageChange(page + 1) }

  const getPageNumbers = () => {
    const pageNumbers = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
      return pageNumbers
    }
    pageNumbers.push(1)
    if (page <= 4) {
      for (let i = 2; i <= 5; i++) pageNumbers.push(i)
      pageNumbers.push('ellipsis')
    } else if (page >= totalPages - 3) {
      pageNumbers.push('ellipsis')
      for (let i = totalPages - 4; i <= totalPages - 1; i++) pageNumbers.push(i)
    } else {
      pageNumbers.push('ellipsis')
      for (let i = page - 1; i <= page + 1; i++) pageNumbers.push(i)
      pageNumbers.push('ellipsis')
    }
    pageNumbers.push(totalPages)
    return pageNumbers
  }

  const pageNumbers = getPageNumbers()

  return (
    /* Adjusted bottom and left spacing for mobile (bottom-20 to clear bottom nav) */
    <div className="fixed right-0 bottom-20 left-0 flex justify-center py-4 md:bottom-0 md:left-44">
      <div className="join bg-white shadow-md rounded-lg border border-gray-200">
        
        {/* Prev Button */}
        <button
          disabled={page === 1}
          className="join-item btn btn-sm px-2 md:px-4"
          onClick={goToPrev}
        >
          « <span className="hidden md:inline text-xs">Prev</span>
        </button>

        {/* Page Buttons - Hidden on mobile, shown on md+ */}
        <div className="hidden md:flex">
          {pageNumbers.map((pageNum, index) => (
            pageNum === 'ellipsis' ? (
              <button key={`ellipsis-${index}`} className="join-item btn btn-sm btn-disabled bg-white">...</button>
            ) : (
              <button
                key={`page-${index}`}
                className={`join-item btn btn-sm ${page === pageNum ? 'btn-active bg-green-button text-white border-green-button' : 'bg-white'}`}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            )
          ))}
        </div>

        {/* Mobile Page Indicator - Shown ONLY on small screens */}
        <button className="join-item btn btn-sm btn-disabled bg-white text-darkbrown md:hidden">
          {page} / {totalPages}
        </button>

        {/* Next Button */}
        <button
          disabled={page >= totalPages}
          className="join-item btn btn-sm px-2 md:px-4"
          onClick={goToNext}
        >
          <span className="hidden md:inline text-xs">Next</span> »
        </button>
      </div>
    </div>
  )
}

export default Pagination