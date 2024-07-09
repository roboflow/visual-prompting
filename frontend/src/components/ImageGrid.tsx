"use client";

import React, { useRef } from "react";
import { Box } from "@/lib/types";
import { classColors } from "./ImageDialog";
import { useRenderBoxes } from "@/hooks/useRenderBoxes";
import { renderBoxes } from "@/lib/renderBoxes";

interface ImageGridProps {
  boxes: { [key: string]: Box[] };
  classes: string[];
  images: File[];
  onImageClick: (image: File) => void;
  suggestedBoxes: { [key: string]: Box[] };
  filterPositive: boolean;
}

const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  boxes,
  classes,
  onImageClick,
  suggestedBoxes,
  filterPositive,
}) => {
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const imageRefs = useRef<{ [key: string]: HTMLImageElement | null }>({});

  const drawBoxes = (
    imageName: string,
    boxes: Box[],
    suggestedBoxes: Box[],
  ) => {
    const canvas = canvasRefs.current[imageName];
    const image = imageRefs.current[imageName];
    if (!canvas || !image) return;
    const { width, height } = image;
    canvas.width = width;
    canvas.height = height;
    renderBoxes({
      canvas,
      image,
      boxes,
      suggestedBoxes,
      classes,
      drawImage: false,
    });
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((image) => (
        <div
          key={image.name}
          className="relative aspect-square overflow-hidden rounded-sm"
          onClick={() => onImageClick(image)}
        >
          <img
            ref={(el) => {
              imageRefs.current[image.name] = el;
            }}
            src={URL.createObjectURL(image)}
            alt={`image-${image.name}`}
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={(event) => {
              URL.revokeObjectURL((event.target as HTMLImageElement).src);
              drawBoxes(
                image.name,
                boxes[image.name]?.filter((box) =>
                  filterPositive ? box.cls != "positive" : true,
                ),
                suggestedBoxes[image.name]?.filter((box) =>
                  filterPositive ? box.cls != "positive" : true,
                ),
              );
            }}
          />
          <canvas
            ref={(el) => {
              canvasRefs.current[image.name] = el;
            }}
            className="absolute inset-0 w-full h-full pointer-events-none object-cover"
          />
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;
