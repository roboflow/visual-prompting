"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
} from "react";
import { Box } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input"; // Add this import
import { useResizeObserver } from "@/hooks/useResizeObserver";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import * as Slider from "@radix-ui/react-slider";
import { renderBoxes } from "@/lib/renderBoxes";
import { EyeNoneIcon, CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import { CONFIDENCE_LEVELS } from "@/lib/constants";
import { Spinner } from "./ui/spinner";

export const classColors = [
  "red",
  "lime",
  "orange",
  "magenta",
  "blue",
  "pink",
  "cyan",
];

interface ImageDialogProps {
  classes: string[];
  setClasses: React.Dispatch<React.SetStateAction<string[]>>;
  imageFile: File;
  isOpen: boolean;
  onClose: () => void;
  boxes: Box[];
  onBoxAdded: (box: Box) => void;
  onBoxesAdded: (boxes: Box[]) => void;
  onPreviousBoxRemoved: () => void;
  onAllBoxesRemoved: () => void;
  suggestedBoxes: Box[];
  confidenceLevel: number;
  setConfidenceLevel: React.Dispatch<React.SetStateAction<number>>;
  trainAndInfer: ({
    newConfidenceLevel,
  }: {
    newConfidenceLevel?: number;
  }) => void;
  isInferring: boolean;
}

const ImageDialog: React.FC<ImageDialogProps> = ({
  classes,
  setClasses,
  imageFile,
  isOpen,
  onClose,
  boxes,
  onBoxAdded,
  onBoxesAdded,
  onPreviousBoxRemoved,
  onAllBoxesRemoved,
  suggestedBoxes,
  confidenceLevel,
  setConfidenceLevel,
  trainAndInfer,
  isInferring,
}) => {
  const [imageUrl, setImageUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<Box | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [currentClass, setCurrentClass] = useState(classes[1]);
  const [newClass, setNewClass] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useResizeObserver(containerRef);
  const sortedSuggestedBoxesWithIndex = suggestedBoxes
    .map((box, index) => ({ ...box, originalIndex: index }))
    .sort((a, b) => b.confidence - a.confidence);
  const [hoveredPredictionIndex, setHoveredPredictionIndex] = useState<
    number | null
  >();
  const [hideHover, setHideHover] = useState(false);
  const [showPredictionsOnly, setShowPredictionsOnly] = useState(false);
  const [showApprovedBoxesOnly, setShowApprovedBoxesOnly] = useState(false);
  const [showNegativeBoxesOnly, setShowNegativeBoxesOnly] = useState(false);

  useEffect(() => {
    if (!classes.includes(currentClass)) {
      setCurrentClass(classes[1]);
    }
  }, [classes, currentClass]);

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

  const renderBoxesCb = useCallback(() => {
    let userBoxesToShow = boxes;
    if (typeof hoveredPredictionIndex == "number" || showPredictionsOnly) {
      userBoxesToShow = [];
    }
    if (showApprovedBoxesOnly) {
      userBoxesToShow = boxes.filter((b) => b.cls != "negative");
    }
    if (showNegativeBoxesOnly) {
      userBoxesToShow = boxes.filter((b) => b.cls == "negative");
    }
    renderBoxes({
      canvas: canvasRef.current,
      image: imageRef.current,
      boxes: userBoxesToShow,
      suggestedBoxes:
        showApprovedBoxesOnly || showNegativeBoxesOnly
          ? []
          : suggestedBoxes
              .map((box) => {
                return {
                  ...box,
                  highlighted:
                    typeof hoveredPredictionIndex == "number" &&
                    box === suggestedBoxes[hoveredPredictionIndex] &&
                    !hideHover,
                };
              })
              .filter(
                (box) =>
                  !(typeof hoveredPredictionIndex == "number") ||
                  box.highlighted,
              ),
      classes,
    });
  }, [
    canvasRef,
    boxes,
    imageRef,
    suggestedBoxes,
    classes,
    hoveredPredictionIndex,
    hideHover,
    showPredictionsOnly,
    showApprovedBoxesOnly,
    showNegativeBoxesOnly,
  ]);

  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      renderBoxesCb();
    }
  }, [canvasSize, renderBoxesCb]);

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
        renderBoxesCb();
      };
      img.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile, containerSize, renderBoxesCb]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (imageUrl && ctx) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        renderBoxesCb();
      };
      img.src = imageUrl;
    }
  }, [imageUrl, boxes, renderBoxesCb]);

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
        confidence: 1,
      });

      if (ctx && imageRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(
          imageRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
        renderBoxesCb();
        if (currentBox) {
          const classIndex = classes.indexOf(currentClass);
          ctx.strokeStyle = classColors[classIndex % classColors.length];
          ctx.strokeRect(
            currentBox.x,
            currentBox.y,
            currentBox.width,
            currentBox.height,
          );
        }
      }
    }
  };

  const addBoxFromSuggested = (box: Box) => {
    // Adjust x and y to be the top left corner
    const adjustedBox = {
      cls: box.cls,
      x: box.x - box.width / 2,
      y: box.y - box.height / 2,
      width: box.width,
      height: box.height,
      confidence: box.confidence || 1,
    };

    onBoxAdded(adjustedBox);
  };

  const addAllSuggestedBoxes = () => {
    onBoxesAdded(
      suggestedBoxes.map((box) => {
        return {
          cls: box.cls,
          x: box.x - box.width / 2,
          y: box.y - box.height / 2,
          width: box.width,
          height: box.height,
          confidence: box.confidence || 1,
        };
      }),
    );
  };

  const denyBoxFromSuggested = (box: Box) => {
    // Adjust x and y to be the top left corner
    const adjustedBox = {
      cls: "negative",
      x: box.x - box.width / 2,
      y: box.y - box.height / 2,
      width: box.width,
      height: box.height,
      confidence: box.confidence || 1,
    };

    onBoxAdded(adjustedBox);
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
        confidence: 1,
      };

      onBoxAdded(adjustedBox);
      setCurrentBox(null);
    }
    setIsDrawing(false);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClass && !classes.includes(newClass)) {
      setClasses((_c) => [..._c, newClass]);
      setNewClass("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] h-[80vh] max-w-[1200px] max-h-[800px] flex py-14">
        <div className="flex flex-1 gap-2 flex-col flex-wrap basis-1/4">
          <form onSubmit={handleAddClass} className="flex gap-2 pb-4">
            <Input
              type="text"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              placeholder="Add new class"
              className="w-full"
              autoFocus
            />
            <Button type="submit" variant="outline">
              Add
            </Button>
          </form>
          {classes.map((cls, index) => (
            <Fragment key={cls}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    key={cls}
                    variant={currentClass === cls ? "default" : "outline"}
                    className="flex items-center w-full"
                    onClick={() => setCurrentClass(cls)}
                  >
                    <span
                      className="w-4 h-4 rounded-full mr-2"
                      style={{
                        backgroundColor:
                          classColors[index % classColors.length],
                      }}
                    ></span>
                    <span className="max-w-32 truncate">
                      {cls}{" "}
                      {boxes.filter((b) => b.cls === cls).length
                        ? boxes.filter((b) => b.cls === cls).length
                        : ""}
                    </span>
                  </Button>
                </TooltipTrigger>
                {cls === "negative" && (
                  <TooltipContent className="z-50">
                    Negative class is used to mark areas that do not contain any
                    of your classes.
                  </TooltipContent>
                )}
                {cls === "positive" && (
                  <TooltipContent className="z-50">
                    Positive class is a default class for testing that will be
                    removed if you add a custom class.
                  </TooltipContent>
                )}
              </Tooltip>
            </Fragment>
          ))}
          <div className="flex-1" />
        </div>
        <div className="flex-2 flex flex-col justify-center w-full gap-3 basis-1/2">
          <div className="flex justify-center w-full items-center gap-2 flex-col">
            <span>Confidence Level</span>
            <Slider.Root
              className="flex h-4 w-48 relative items-center"
              defaultValue={[confidenceLevel]}
              max={Object.keys(CONFIDENCE_LEVELS).length - 1}
              step={1}
              onValueChange={(value) => {
                setConfidenceLevel(value[0]);
                trainAndInfer({ newConfidenceLevel: value[0] });
              }}
            >
              <Slider.Track className="bg-secondary h-1 w-full rounded-full relative">
                <Slider.Range className="absolute rounded-full h-full bg-primary" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-primary rounded-full"
                aria-label="Confidence Level"
              />
            </Slider.Root>
          </div>
          <div ref={containerRef} className="w-full flex-1 flex items-center">
            <canvas
              ref={canvasRef}
              id="imageCanvas"
              width={canvasSize.width}
              height={canvasSize.height}
              className="max-w-full max-h-full mx-auto cursor-pointer"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            ></canvas>
          </div>
          <div className="flex gap-2 mt-1">
            <Button
              onClick={() => {
                onPreviousBoxRemoved();
              }}
              variant="outline"
              disabled={boxes.length === 0}
            >
              Undo
            </Button>
            <Button
              onClick={() => {
                onAllBoxesRemoved();
              }}
              variant="destructive"
              disabled={boxes.length === 0}
            >
              Remove All Boxes
            </Button>
          </div>
        </div>
        <div className="flex-1 basis-1/4 overflow-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Predictions</h2>
            {/* Loading Spinner */}
            {isInferring && <Spinner className="w-6 h-6" />}
          </div>
          <div className="mb-4">
            <div
              className="flex w-full select-none pl-2 py-2 gap-2 items-center shadow-sm hover:-translate-y-1 hover:shadow-md rounded-lg"
              onMouseEnter={() => setShowPredictionsOnly(true)}
              onMouseLeave={() => setShowPredictionsOnly(false)}
            >
              Only show predictions ({sortedSuggestedBoxesWithIndex.length})
            </div>
            <div
              className="flex w-full select-none pl-2 py-2 gap-2 items-center shadow-sm hover:-translate-y-1 hover:shadow-md rounded-lg"
              onMouseEnter={() => setShowApprovedBoxesOnly(true)}
              onMouseLeave={() => setShowApprovedBoxesOnly(false)}
            >
              Only show approved (
              {boxes.filter((b) => b.cls != "negative").length})
            </div>
            <div
              className="flex w-full select-none pl-2 py-2 gap-2 items-center shadow-sm hover:-translate-y-1 hover:shadow-md rounded-lg"
              onMouseEnter={() => setShowNegativeBoxesOnly(true)}
              onMouseLeave={() => setShowNegativeBoxesOnly(false)}
            >
              Only show negative (
              {boxes.filter((b) => b.cls == "negative").length})
            </div>
          </div>

          {sortedSuggestedBoxesWithIndex.length ? (
            <div className="flex flex-col">
              <span className="pb-2">
                {sortedSuggestedBoxesWithIndex.length} predictions found
              </span>
              <Button
                onClick={() => {
                  addAllSuggestedBoxes();
                }}
                variant="secondary"
                size="sm"
              >
                Approve All
              </Button>
            </div>
          ) : null}

          <ul className="flex flex-col">
            {sortedSuggestedBoxesWithIndex.map((b, i) => {
              const hovered = hoveredPredictionIndex === b.originalIndex;
              return (
                <Fragment key={i}>
                  <li
                    className="flex w-full py-2 items-center justify-between shadow-sm hover:shadow-md rounded-lg"
                    onMouseEnter={() => {
                      console.log("pred", i, b);
                      setHoveredPredictionIndex(b.originalIndex);
                    }}
                    onMouseLeave={() => {
                      setHoveredPredictionIndex(null);
                    }}
                  >
                    <span className="select-none pl-2">
                      {i + 1}. {b.cls}
                    </span>
                    {hovered && (
                      <div className="flex gap-2 items-center">
                        <EyeNoneIcon
                          // Pop effect
                          className="h-8 w-8 rounded-full p-1 bg-slate-50 hover:-translate-y-[2px] hover:shadow-md"
                          onMouseEnter={() => setHideHover(true)}
                          onMouseLeave={() => setHideHover(false)}
                        />
                        <Button
                          variant="default"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            addBoxFromSuggested(b);
                          }}
                        >
                          <CheckIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            denyBoxFromSuggested(b);
                          }}
                        >
                          <Cross2Icon className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageDialog;
