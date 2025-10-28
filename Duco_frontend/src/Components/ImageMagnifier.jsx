import React, { useState, useRef, useEffect } from "react";

export default function ImageMagnifier({ src, zoom = 2.5, lensSize = 160 }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, imageX: 0, imageY: 0 });
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgNatural, setImgNatural] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update container size on resize and image load
  useEffect(() => {
    if (!wrapRef.current) return;
    const updateSize = () => {
      const rect = wrapRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [src]);

  // Handle image load
  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgNatural({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight
      });
      setImgLoaded(true);
    }
  };

  // Mouse move handler
  const onMove = (e) => {
    if (!wrapRef.current || !imgRef.current || !imgLoaded) return;

    const containerRect = wrapRef.current.getBoundingClientRect();
    const imgRect = imgRef.current.getBoundingClientRect();

    // Calculate image position within container
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;
    
    // Mouse position relative to container
    const containerX = e.clientX - containerRect.left;
    const containerY = e.clientY - containerRect.top;
    
    // Clamp position to image boundaries
    const x = Math.max(offsetX, Math.min(containerX, offsetX + imgRect.width));
    const y = Math.max(offsetY, Math.min(containerY, offsetY + imgRect.height));
    
    // Convert to image coordinates
    const imageX = (x - offsetX) * (imgNatural.width / imgRect.width);
    const imageY = (y - offsetY) * (imgNatural.height / imgRect.height);

    setPos({ x, y, imageX, imageY });
  };

  // Calculate lens boundaries
  const lensHalf = lensSize / 2;
  const maxLeft = containerSize.width - lensSize;
  const maxTop = containerSize.height - lensSize;
  const lensLeft = Math.max(0, Math.min(pos.x - lensHalf, maxLeft));
  const lensTop = Math.max(0, Math.min(pos.y - lensHalf, maxTop));

  return (
    <div
      ref={wrapRef}
      className="relative w-full sm:h-[52%] max-w-[500px] md:max-w-full rounded-xl bg-white shadow-md overflow-hidden"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onMouseMove={onMove}
    >
      <img
        ref={imgRef}
        src={src}
        alt="Magnifiable"
        className="w-full h-full object-contain"
        onLoad={handleImageLoad}
      />

      {show && imgLoaded && (
        <div
          className="absolute pointer-events-none  rounded-full border-2 border-[#E5C870] shadow-lg overflow-hidden"
         style={{
  width: `${lensSize}px`,
  height: `${lensSize}px`,
  top: `${lensTop}px`,
  left: `${lensLeft}px`,
  backgroundImage: `url(${src})`,
  backgroundRepeat: "no-repeat",
  backgroundSize: `${imgNatural.width * zoom}px ${imgNatural.height * zoom}px`,
  backgroundPositionX: `${-(pos.imageX * zoom - lensSize / 2)}px`,
  backgroundPositionY: `${-(pos.imageY * zoom - lensSize / 2)}px`,
}}

        />
      )}
    </div>
  );
}