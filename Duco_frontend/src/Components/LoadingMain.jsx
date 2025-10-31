import React from 'react'

const LoadingMain = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
    </div>
  )
}

export default LoadingMain