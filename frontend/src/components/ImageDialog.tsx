import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogClose } from './ui/dialog';
import { Button } from './ui/button';

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
        boxes.forEach(box => {
          ctx.strokeStyle = 'red';
          ctx.strokeRect(box.x, box.y, box.width, box.height);
        });
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

      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          boxes.forEach(box => {
            ctx.strokeStyle = 'red';
            ctx.strokeRect(box.x, box.y, box.width, box.height);
          });
          // Draw the current box
          if (currentBox) {
            ctx.strokeStyle = 'blue';
            ctx.strokeRect(startPos.x, startPos.y, currentWidth, currentHeight);
          }
        };
        img.src = imageUrl;
      }
    }
  };

  const handleMouseUp = () => {
    if (currentBox) {
      onAddBox(currentBox);
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
