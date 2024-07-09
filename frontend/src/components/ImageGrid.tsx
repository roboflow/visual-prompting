"use client";

import React, { useRef } from "react";
import { Box } from "@/lib/types";
import { renderBoxes } from "@/lib/renderBoxes";
import { Button } from "./ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";

interface ImageGridProps {
  boxes: { [key: string]: Box[] };
  classes: string[];
  images: File[];
  onImageClick: (image: File) => void;
  onImageRemoved: (index: number) => void;
  suggestedBoxes: { [key: string]: Box[] };
  filterPositive: boolean;
}

const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  boxes,
  classes,
  onImageClick,
  onImageRemoved,
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
      {images.map((image, i) => (
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
            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
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
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onImageRemoved(i);
            }}
            className="absolute opacity-60 m-1 right-0"
            variant="destructive"
            size="icon"
          >
            <Cross2Icon className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;
