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

        // Set canvas dimensions to match the image's natural dimensions
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;

        boxes.forEach(box => {
          const x = box.x - box.width / 2;
          const y = box.y - box.height / 2;

          ctx.strokeStyle = color;
          ctx.setLineDash(style === "dashed" ? [2, 2] : []);
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, box.width, box.height);
        });
      }
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((image) => (
        <div key={image.name} className="relative aspect-square overflow-hidden rounded-sm" onClick={() => onImageClick(image)}>
          <img
            ref={el => { imageRefs.current[image.name] = el }}
            src={URL.createObjectURL(image)}
            alt={`image-${image.name}`}
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={(event) => {
              URL.revokeObjectURL((event.target as HTMLImageElement).src);
              drawBoxes(image.name, boxes[image.name], "solid", "red");
              drawBoxes(image.name, suggestedBoxes[image.name], "dashed", "green");
            }}
          />
          <canvas
            ref={el => { canvasRefs.current[image.name] = el }}
            className="absolute inset-0 w-full h-full pointer-events-none object-cover"
          />
        </div>
      ))}
    </div>
  );
};

export default ImageGrid
