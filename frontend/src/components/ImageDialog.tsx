import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "@/components/ui/button";

import { Box } from "@/lib/types";

interface ImageDialogProps {
  imageFile: File;
  isOpen: boolean;
  onClose: () => void;
  isLabelingNegative: boolean;
  boxes: Box[];
  onAddBox: (box: Box, imageWidth: number, imageHeight: number) => void;
  suggestedBoxes: Box[];
  setLabelingNegative: (value: boolean) => void;
}

const ImageDialog: React.FC<ImageDialogProps> = ({
  imageFile,
  isOpen,
  onClose,
  isLabelingNegative,
  boxes,
  onAddBox,
  suggestedBoxes,
  setLabelingNegative,
}) => {
  const [imageUrl, setImageUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<Box | null>(null);
  const [returnedImage, setReturnedImage] = useState<string | null>(null);

  const renderBoxes = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && imageRef.current) {
      ctx.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);

      // Draw the image on the canvas
      ctx.drawImage(
        imageRef.current,
        0,
        0,
        canvas?.width || 0,
        canvas?.height || 0
      );

      // Calculate scale ratios
      const scaleX = (canvas?.width || 0) / imageRef.current.width;
      const scaleY = (canvas?.height || 0) / imageRef.current.height;

      boxes.forEach((box) => {
        ctx.strokeStyle = box.negative ? "red": "lime";
        ctx.setLineDash([]);
        ctx.strokeRect(
          box.x * scaleX,
          box.y * scaleY,
          box.width * scaleX,
          box.height * scaleY
        );
      });

      suggestedBoxes.forEach((box) => {
        const scaledX = box.x * scaleX;
        const scaledY = box.y * scaleY;
        const scaledWidth = box.width * scaleX;
        const scaledHeight = box.height * scaleY;
        const x1 = scaledX - scaledWidth / 2;
        const y1 = scaledY - scaledHeight / 2;

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "lime";
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(x1, y1, scaledWidth, scaledHeight);
      });
    }
  }, [boxes, imageRef, suggestedBoxes]);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (imageUrl && ctx) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        renderBoxes();
      };
      img.src = imageUrl;
    }
  }, [imageUrl, boxes, renderBoxes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setStartPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const currentWidth = e.clientX - rect.left - startPos.x;
      const currentHeight = e.clientY - rect.top - startPos.y;
      setCurrentBox({
        x: startPos.x,
        y: startPos.y,
        width: currentWidth,
        height: currentHeight,
        negative: isLabelingNegative
      });

      if (ctx && imageRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(
          imageRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        renderBoxes();
        if (currentBox) {
          ctx.strokeStyle = "red";
          ctx.strokeRect(startPos.x, startPos.y, currentWidth, currentHeight);
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (currentBox && imageRef.current) {
      const imgWidth = imageRef.current.width;
      const imgHeight = imageRef.current.height;
      const canvasWidth = canvasRef.current?.width || 1; // Avoid division by zero
      const canvasHeight = canvasRef.current?.height || 1;

      // Calculate the scale ratios
      const scaleX = imgWidth / canvasWidth;
      const scaleY = imgHeight / canvasHeight;

      // Adjust box dimensions to be relative to the image size
      const adjustedBox = {
        x: currentBox.x * scaleX,
        y: currentBox.y * scaleY,
        width: Math.abs(currentBox.width) * scaleX,
        height: Math.abs(currentBox.height) * scaleY,
        negative: isLabelingNegative
      };

      onAddBox(adjustedBox, imgWidth, imgHeight);
      setCurrentBox(null);
    }
    setIsDrawing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[800px] min-h-[600px]">
        <Button
          type="button"
          onClick={() => {
            setLabelingNegative(!isLabelingNegative);
          }}
        >
          {isLabelingNegative
            ? "Label Positives (Currently Labeling Negatives)"
            : "Label Negatives (Currently Labeling Positives)"}
        </Button>
        <canvas
          className="mt-5"
          ref={canvasRef}
          id="imageCanvas"
          width="700"
          height="600"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        ></canvas>
      </DialogContent>
    </Dialog>
  );
};

export default ImageDialog;
