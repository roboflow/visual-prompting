"use client";

import ImageDialog from "@/components/ImageDialog";
import ImageGrid from "@/components/ImageGrid";
import { Box } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const API_ROOT = "https://api.owlvit.com";

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

function normalizeBoxes(boxes: Box[], imageWidth: number, imageHeight: number) {
  return boxes.map((box) => ({
    cls: box.cls,
    bbox: {
      x: (box.x + box.width / 2) / imageWidth,
      y: (box.y + box.height / 2) / imageHeight,
      w: box.width / imageWidth,
      h: box.height / imageHeight,
    },
    confidence: 0.5,
  }));
}

const getImageDimensions = (
  file: File,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = URL.createObjectURL(file);
  });
};

export default function Home() {
  const [images, setImages] = useState<File[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [userBoxes, setUserBoxes] = useState<{ [key: string]: Box[] }>({});
  const [suggestedBoxes, setSuggestedBoxes] = useState<{
    [key: string]: Box[];
  }>({});
  const [classes, setClasses] = useState(["negative", "positive"]);
  const [isInferring, setIsInferring] = useState(false);

  async function onBoxAdded(box: Box, imageWidth: number, imageHeight: number) {
    if (!selectedImage) {
      return;
    }

    const newBoxes = [...(userBoxes[selectedImage.name] || []), box];
    setUserBoxes({ ...userBoxes, [selectedImage.name]: newBoxes });

    const imageBase64 = (await toBase64(selectedImage))
      .replace("data:image/png;base64,", "")
      .replace("data:image/jpeg;base64,", "");

    // Train
    const trainResponse = await fetch(`${API_ROOT}/train`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          image_contents: imageBase64,
          boxes: normalizeBoxes(newBoxes, imageWidth, imageHeight),
        },
      ]),
    });

    // Infer
    const trainData = await trainResponse.json();
    const modelId = trainData.model_id;

    const inferResponse = await fetch(`${API_ROOT}/infer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: modelId,
        image_contents: imageBase64,
        confidence_threshold: 0.9993,
      }),
    });

    const inferData = await inferResponse.json();

    const newSuggestedBoxes = inferData.boxes.map((box: any) => ({
      cls: box.cls,
      x: box.bbox.x * imageWidth,
      y: box.bbox.y * imageHeight,
      width: box.bbox.w * imageWidth,
      height: box.bbox.h * imageHeight,
    }));

    const filteredBoxes: Box[] = newSuggestedBoxes.filter(
      (obj: Box) => obj.cls !== "negative",
    );

    setSuggestedBoxes({
      ...suggestedBoxes,
      [selectedImage.name]: filteredBoxes,
    });
  }

  async function handleDialogClose() {
    setDialogOpen(false);
    setSelectedImage(null);
    setIsInferring(true);

    // Train model on all labeled images
    const labeledImages = Object.entries(userBoxes).filter(
      ([_, boxes]) => boxes.length > 0,
    );
    if (labeledImages.length === 0) return;

    const trainingData = await Promise.all(
      labeledImages.map(async ([imageName, boxes]) => {
        const image = images.find((img) => img.name === imageName);
        if (!image) return null;
        const imageBase64 = await toBase64(image);
        const { width, height } = await getImageDimensions(image);
        return {
          image_contents: imageBase64.replace(
            /^data:image\/(png|jpeg);base64,/,
            "",
          ),
          boxes: normalizeBoxes(boxes, width, height),
        };
      }),
    );

    const trainResponse = await fetch(`${API_ROOT}/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trainingData.filter(Boolean)),
    });

    const trainData = await trainResponse.json();
    const modelId = trainData.model_id;

    // Run inference on all images
    const newSuggestedBoxes = { ...suggestedBoxes };
    for (const image of images) {
      const imageBase64 = await toBase64(image);
      const { width, height } = await getImageDimensions(image);
      const inferResponse = await fetch(`${API_ROOT}/infer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: modelId,
          image_contents: imageBase64.replace(
            /^data:image\/(png|jpeg);base64,/,
            "",
          ),
          confidence_threshold: 0.9993,
        }),
      });

      const inferData = await inferResponse.json();
      const inferredBoxes = inferData.boxes
        .filter((box: any) => box.cls !== "negative")
        .map((box: any) => ({
          cls: box.cls,
          x: box.bbox.x * width,
          y: box.bbox.y * height,
          width: box.bbox.w * width,
          height: box.bbox.h * height,
        }));

      newSuggestedBoxes[image.name] = inferredBoxes;
    }

    setSuggestedBoxes(newSuggestedBoxes);
    setIsInferring(false);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;

    if (files) {
      Array.from(files).map((imageFile) => {
        toBase64(imageFile).then((imageBase64) => {
          let imageBase64Stripped = imageBase64
            .replace("data:image/png;base64,", "")
            .replace("data:image/jpeg;base64,", "");
          fetch(`${API_ROOT}/train`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify([
              {
                image_contents: imageBase64Stripped,
                boxes: [],
              },
            ]),
          });
        });
      });
      setImages([...images, ...Array.from(files)]);
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1 bg-gray-100 dark:bg-gray-800 py-12 md:py-24">
        <div className="container max-w-4xl px-4 md:px-6 space-y-12">
          <section>
            <h1 className="text-3xl font-bold mb-4">
              OWLv2 Few-Shot Object Detection Demo
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              OWLv2 is a model for zero-shot object detection using image and
              text prompting.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">Images</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Add one or more images that you want to label as examples for your
              computer vision model. As you label, the model will make
              predictions on the images and learn from your examples.
            </p>
            <div className="bg-white dark:bg-gray-950 rounded-lg p-6 shadow">
              {isInferring && (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  <span className="ml-2">Labeling all images...</span>
                </div>
              )}
              <form className="space-y-6">
                <div>
                  <div>
                    <div className="mb-5">
                      <ImageGrid
                        classes={classes}
                        images={images}
                        onImageClick={(image) => {
                          setSelectedImage(image);
                          setDialogOpen(true);
                        }}
                        boxes={userBoxes}
                        suggestedBoxes={suggestedBoxes}
                      />
                    </div>
                    <input
                      type="file"
                      id="example-images"
                      className="hidden"
                      onChange={handleImageUpload}
                      multiple
                    />
                    {images.length === 0 && (
                      <label
                        htmlFor="example-images"
                        className="flex items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg h-32 cursor-pointer dark:border-gray-600"
                      >
                        <div className="text-center">
                          <div className="flex flex-col items-center">
                            <UploadIcon className="h-6 w-6 text-gray-400 mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">
                              Drag and drop files or click to upload
                            </p>
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    document.getElementById("example-images")?.click()
                  }
                >
                  Add Images
                </Button>
              </form>
            </div>
          </section>
        </div>
      </main>
      {selectedImage && (
        <ImageDialog
          classes={classes}
          setClasses={setClasses}
          imageFile={selectedImage}
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          boxes={userBoxes[selectedImage.name] || []}
          onAddBox={onBoxAdded}
          suggestedBoxes={suggestedBoxes[selectedImage.name] || []}
        />
      )}
    </div>
  );
}

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
