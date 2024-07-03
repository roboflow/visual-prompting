"use client"

import React, { useRef } from 'react'
import { Box } from '@/lib/types'

interface ImageGridProps {
  boxes: { [key: string]: Box[] }
  images: File[]
  onImageClick: (image: File) => void
  suggestedBoxes: { [key: string]: Box[] }
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, boxes, onImageClick, suggestedBoxes }) => {
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const imageRefs = useRef<{ [key: string]: HTMLImageElement | null }>({});

  const drawBoxes = (imageName: string, boxes: Box[], style: string = "solid", color: string = "red") => {
    const canvas = canvasRefs.current[imageName];
    const imgElement = imageRefs.current[imageName];
    if (canvas && imgElement) {
      const ctx = canvas.getContext('2d');
      if (ctx && boxes) {
        const { naturalWidth, naturalHeight } = imgElement;
        const { width: displayWidth, height: displayHeight } = imgElement.getBoundingClientRect();
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        const scaleX = displayWidth / naturalWidth;
        const scaleY = displayHeight / naturalHeight;
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (displayWidth - naturalWidth * scale) / 2;
        const offsetY = (displayHeight - naturalHeight * scale) / 2;

        boxes.forEach(box => {
          const scaledX = (box.x - box.width / 2) * scale + offsetX;
          const scaledY = (box.y - box.height / 2) * scale + offsetY;
          const scaledWidth = box.width * scale;
          const scaledHeight = box.height * scale;

          ctx.strokeStyle = color;
          ctx.setLineDash(style === "dashed" ? [2, 2] : []);
          ctx.lineWidth = 2;
          ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        });
      }
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((image) => (
        <div key={image.name} className="relative aspect-square" onClick={() => onImageClick(image)}>
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              ref={el => { imageRefs.current[image.name] = el }}
              src={URL.createObjectURL(image)}
              alt={`image-${image.name}`}
              className="max-w-full max-h-full object-contain"
              onLoad={(event) => {
                URL.revokeObjectURL((event.target as HTMLImageElement).src);
                drawBoxes(image.name, boxes[image.name], "solid", "red");
                drawBoxes(image.name, suggestedBoxes[image.name], "dashed", "green");
              }}
            />
            <canvas
              ref={el => { canvasRefs.current[image.name] = el }}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImageGrid
