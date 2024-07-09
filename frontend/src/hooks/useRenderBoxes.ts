import { Box } from "@/lib/types";
import { useCallback } from "react";

export const classColors = [
  "red",
  "lime",
  "orange",
  "magenta",
  "blue",
  "pink",
  "cyan",
];

export function useRenderBoxes({
  boxes,
  suggestedBoxes,
  classes,
  drawImage = true,
}: {
  boxes: Box[];
  suggestedBoxes: Box[];
  classes: string[];
  drawImage?: boolean;
}) {
  return useCallback(
    ({
      canvasRef,
      imageRef,
    }: {
      canvasRef: React.RefObject<HTMLCanvasElement>;
      imageRef: React.RefObject<HTMLImageElement>;
    }) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && imageRef.current && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the image on the canvas
        if (drawImage) {
          ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
        }

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
            box.height * scaleY,
          );
        });

        suggestedBoxes.forEach((box) => {
          const scaledX = box.x * scaleX;
          const scaledY = box.y * scaleY;
          const scaledWidth = box.width * scaleX;
          const scaledHeight = box.height * scaleY;
          const x1 = scaledX - scaledWidth / 2;
          const y1 = scaledY - scaledHeight / 2;

          const classIndex = classes.indexOf(box.cls || "");
          ctx.strokeStyle = classColors[classIndex % classColors.length];
          ctx.lineWidth = 2.5;
          ctx.setLineDash([2, 2]);
          ctx.strokeRect(x1, y1, scaledWidth, scaledHeight);
        });
      }
    },
    [boxes, suggestedBoxes, classes],
  );
}
