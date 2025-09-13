export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16">
            <svg 
              className="animate-spin h-12 w-12 text-blue-600" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-label="Loading"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </div>
        
        {/* Loading Text */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Loading...
          </h2>
          <p className="text-gray-600 text-sm">
            Please wait while we prepare your content
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 w-48 mx-auto">
          <div className="bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}