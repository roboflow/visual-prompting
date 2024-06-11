import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';

interface ImageDialogProps {
  imageFile: File;
  isOpen: boolean;
  onClose: () => void;
  boxes: { x: number, y: number, width: number, height: number }[];
  onAddBox: (box: { x: number, y: number, width: number, height: number }) => void;
}

const ImageDialog: React.FC<ImageDialogProps> = ({ imageFile, isOpen, onClose, boxes, onAddBox }) => {
  const [imageUrl, setImageUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

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
    const ctx = canvas?.getContext('2d');
    if (imageUrl && ctx) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Calculate scale ratios
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;

        boxes.forEach(box => {
          // Adjust box dimensions to canvas scale
          const scaledBox = {
            x: box.x * scaleX,
            y: box.y * scaleY,
            width: box.width * scaleX,
            height: box.height * scaleY,
          };

          ctx.strokeStyle = 'red';
          ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);
        });

        imageRef.current = img; // Store the loaded image
      };
      img.src = imageUrl;
    }
  }, [imageUrl, boxes]);

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
      const ctx = canvasRef.current.getContext('2d');
      const currentWidth = e.clientX - rect.left - startPos.x;
      const currentHeight = e.clientY - rect.top - startPos.y;
      setCurrentBox({
        x: startPos.x,
        y: startPos.y,
        width: currentWidth,
        height: currentHeight,
      });

      if (ctx && imageRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(imageRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        boxes.forEach(box => {
          // Adjust box dimensions to canvas scale
          const scaledBox = {
            x: box.x * (canvasRef.current.width / imageRef.current.width),
            y: box.y * (canvasRef.current.height / imageRef.current.height),
            width: box.width * (canvasRef.current.width / imageRef.current.width),
            height: box.height * (canvasRef.current.height / imageRef.current.height),
          };

          ctx.strokeStyle = 'red';
          ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);
        });
        // Draw the current box
        if (currentBox) {
          ctx.strokeStyle = 'red';
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
        width: currentBox.width * scaleX,
        height: currentBox.height * scaleY,
      };

      onAddBox(adjustedBox);
      setCurrentBox(null);
    }
    setIsDrawing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[800px] min-h-[600px]">
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
