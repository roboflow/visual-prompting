import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogClose } from './ui/dialog';
import { Button } from './ui/button';

interface ImageDialogProps {
  imageFile: File;
  isOpen: boolean;
  onClose: () => void;
}

const ImageDialog: React.FC<ImageDialogProps> = ({ imageFile, isOpen, onClose }) => {
  const [imageUrl, setImageUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    if (imageUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = imageUrl;
      }
    }
  }, [imageUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[800px] min-h-[600px]">
        <canvas className="mt-5" ref={canvasRef} id="imageCanvas" width="700" height="600"></canvas>
      </DialogContent>
    </Dialog>
  );
};

export default ImageDialog;
