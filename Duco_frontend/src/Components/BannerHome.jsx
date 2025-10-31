import React from 'react'

const BannerHome = ({link}) => {
  return (
    <section
  className="relative mt-[100px] sm:mt-10 px-4 md:px-8 lg:px-16 bg-center bg-cover bg-no-repeat aspect-[16/9]"
  style={{
    backgroundImage: `url(${link})`
  }}
>
  {/* Dark overlay (optional, remove if not needed) */}
  <div className="absolute inset-0 bg-black/30"></div>
</section>

  )
}

export default BannerHome