"use client"

import React from 'react'

interface ImageGridProps {
  images: File[]
  onImageClick: (image: File) => void
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((image, index) => (
        <div key={index} className="w-full" onClick={() => onImageClick(image)}>
          <img
            src={URL.createObjectURL(image)}
            alt={`image-${index}`}
            className="w-full h-auto"
            onLoad={(event) => URL.revokeObjectURL((event.target as HTMLImageElement).src)} // Clean up object URLs
          />
        </div>
      ))}
    </div>
  );
};

export default ImageGrid
