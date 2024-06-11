"use client"

import React, { useRef } from 'react'

interface ImageGridProps {
  boxes: { [key: string]: { x: number, y: number, width: number, height: number }[] }
  images: File[]
  onImageClick: (image: File) => void
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, boxes, onImageClick }) => {
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  const drawBoxes = (imageName: string) => {
    const canvas = canvasRefs.current[imageName];
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const imageBoxes = boxes[imageName];
      if (ctx && imageBoxes) {
        const imgElement = document.querySelector(`img[alt="image-${imageName}"]`) as HTMLImageElement;
        if (imgElement) {
          const { naturalWidth, naturalHeight } = imgElement;
          const { width: canvasWidth, height: canvasHeight } = canvas;

          const xRatio = canvasWidth / naturalWidth;
          const yRatio = canvasHeight / naturalHeight;

          imageBoxes.forEach(box => {
            const scaledX = box.x * xRatio;
            const scaledY = box.y * yRatio;
            const scaledWidth = box.width * xRatio;
            const scaledHeight = box.height * yRatio;

            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
          });
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((image) => (
        <div key={image.name} className="relative w-full" onClick={() => onImageClick(image)}>
          <canvas
            ref={el => { canvasRefs.current[image.name] = el }}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          <img
            src={URL.createObjectURL(image)}
            alt={`image-${image.name}`}
            className="w-full h-auto"
            onLoad={(event) => {
              URL.revokeObjectURL((event.target as HTMLImageElement).src);
              drawBoxes(image.name);
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default ImageGrid
