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
        const { width: displayWidth, height: displayHeight } = canvas;
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        const scaleX = displayWidth / naturalWidth;
        const scaleY = displayHeight / naturalHeight;
        const scale = Math.max(scaleX, scaleY);

        const offsetX = (displayWidth - naturalWidth * scale) / 2;
        const offsetY = (displayHeight - naturalHeight * scale) / 2;

        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

        boxes.forEach(box => {
          const x = box.x - box.width / 2;
          const y = box.y - box.height / 2;

          ctx.strokeStyle = color;
          ctx.setLineDash(style === "dashed" ? [2, 2] : []);
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(x, y, box.width, box.height);
        });

        ctx.setTransform(1, 0, 0, 1, 0, 0);
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
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>
      ))}
    </div>
  );
};

export default ImageGrid
