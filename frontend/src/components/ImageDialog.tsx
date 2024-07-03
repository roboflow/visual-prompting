import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input"; // Add this import
import { useResizeObserver } from "@/hooks/useResizeObserver";

const classColors = [
  "red",
  "lime",
  "orange",
  "magenta",
  "blue",
  "pink",
  "cyan",
]

interface ImageDialogProps {
  imageFile: File;
  isOpen: boolean;
  onClose: () => void;
  boxes: Box[];
  onAddBox: (box: Box, imageWidth: number, imageHeight: number) => void;
  suggestedBoxes: Box[];
}

const ImageDialog: React.FC<ImageDialogProps> = ({
  imageFile,
  isOpen,
  onClose,
  boxes,
  onAddBox,
  suggestedBoxes,
}) => {
  const [imageUrl, setImageUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<Box | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [currentClass, setCurrentClass] = useState("positive");
  const [classes, setClasses] = useState(["negative", "positive"]);
  const [newClass, setNewClass] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useResizeObserver(containerRef);

  // Add this new useEffect hook
  useEffect(() => {
    if (containerSize && imageRef.current) {
      const aspectRatio = imageRef.current.width / imageRef.current.height;
      let newWidth = containerSize.width;
      let newHeight = containerSize.height;

      if (aspectRatio > containerSize.width / containerSize.height) {
        newHeight = containerSize.width / aspectRatio;
      } else {
        newWidth = containerSize.height * aspectRatio;
      }

      setCanvasSize({ width: newWidth, height: newHeight });
    }
  }, [containerSize]);

  const renderBoxes = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && imageRef.current && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the image on the canvas
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

      // Calculate scale ratios
      const scaleX = canvas.width / imageRef.current.width;
      const scaleY = canvas.height / imageRef.current.height;

      boxes.forEach((box) => {
        const classIndex = classes.indexOf(box.cls || "");
        ctx.strokeStyle = classColors[classIndex % classColors.length];
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
  }, [boxes, imageRef, suggestedBoxes, classes]);

  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      renderBoxes();
    }
  }, [canvasSize, renderBoxes]);


  useEffect(() => {
    if (imageFile && containerSize) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);

      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        const aspectRatio = img.width / img.height;
        let newWidth = containerSize.width;
        let newHeight = containerSize.height;

        if (aspectRatio > containerSize.width / containerSize.height) {
          newHeight = containerSize.width / aspectRatio;
        } else {
          newWidth = containerSize.height * aspectRatio;
        }

        setCanvasSize({ width: newWidth, height: newHeight });
        renderBoxes();
      };
      img.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile, containerSize, renderBoxes]);

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
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const width = currentX - startPos.x;
      const height = currentY - startPos.y;
      setCurrentBox({
        cls: currentClass,
        x: Math.min(startPos.x, currentX),
        y: Math.min(startPos.y, currentY),
        width: Math.abs(width),
        height: Math.abs(height),
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
          const classIndex = classes.indexOf(currentClass);
          ctx.strokeStyle = classColors[classIndex % classColors.length];
          ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (currentBox && imageRef.current) {
      const imgWidth = imageRef.current.width;
      const imgHeight = imageRef.current.height;
      const canvasWidth = canvasRef.current?.width || 1;
      const canvasHeight = canvasRef.current?.height || 1;

      const scaleX = imgWidth / canvasWidth;
      const scaleY = imgHeight / canvasHeight;

      // Calculate the correct x and y coordinates
      const x = Math.min(currentBox.x, currentBox.x + currentBox.width);
      const y = Math.min(currentBox.y, currentBox.y + currentBox.height);

      // Adjust box dimensions to be relative to the image size
      const adjustedBox = {
        cls: currentClass,
        x: x * scaleX,
        y: y * scaleY,
        width: Math.abs(currentBox.width) * scaleX,
        height: Math.abs(currentBox.height) * scaleY,
      };

      onAddBox(adjustedBox, imgWidth, imgHeight);
      setCurrentBox(null);
    }
    setIsDrawing(false);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClass && !classes.includes(newClass)) {
      setClasses([...classes, newClass]);
      setNewClass("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[80vw] h-[80vh] max-w-[1200px] max-h-[800px]">
        <div className="flex space-x-2 items-center">
          {classes.map((cls, index) => (
            <Button
              key={cls}
              variant={currentClass === cls ? "default" : "outline"}
              className={"flex items-center"}
              onClick={() => setCurrentClass(cls)}
            >
              <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: classColors[index % classColors.length] }}></span>
              {cls}
            </Button>
          ))}
          <form onSubmit={handleAddClass} className="flex space-x-2">
            <Input
              type="text"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              placeholder="Add new class"
              className="w-32 ml-5"
            />
            <Button type="submit" variant="outline">Add</Button>
          </form>
        </div>
        <div ref={containerRef} className="mt-5 w-full h-[calc(100%-60px)]">
          <canvas
            ref={canvasRef}
            id="imageCanvas"
            width={canvasSize.width}
            height={canvasSize.height}
            className="max-w-full max-h-full mx-auto"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          ></canvas>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageDialog;
