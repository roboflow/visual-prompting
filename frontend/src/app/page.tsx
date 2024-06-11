"use client"

import ImageGrid from "@/components/ImageGrid";
import { Button } from "@/components/ui/button"
import { useState } from "react";
import ImageDialog from "@/components/ImageDialog";

import { Box, Datum } from "@/lib/types";

export default function Home() {
  const [images, setImages] = useState<File[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [userBoxes, setUserBoxes] = useState<{ [key: string]: Box[] }>({});
  const [suggestedBoxes, setSuggestedBoxes] = useState<{ [key: string]: Box[] }>({});

  function onBoxAdded(box: Box) {
    if (selectedImage) {
      setUserBoxes({ ...userBoxes, [selectedImage.name]: [...(userBoxes[selectedImage.name] || []), box] });
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      setImages([...images, ...Array.from(files)]);
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1 bg-gray-100 dark:bg-gray-800 py-12 md:py-24">
        <div className="container max-w-4xl px-4 md:px-6 space-y-12">
          <section>
            <h1 className="text-3xl font-bold mb-4">OWLv2 Few-Shot Object Detection Demo</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              OWLv2 is a model for zero-shot object detection using image and text prompting.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">Images</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Add one or more images that you want to label as examples for your computer vision model.
              As you label, the model will make predictions on the images and learn from your examples.
            </p>
            <div className="bg-white dark:bg-gray-950 rounded-lg p-6 shadow">
              <form className="space-y-6">
                <div>
                  <div>
                    <div className="mb-5">
                      <ImageGrid images={images} onImageClick={(image) => { setSelectedImage(image); setDialogOpen(true); }} boxes={userBoxes} suggestedBoxes={suggestedBoxes} />
                    </div>
                    <input
                      type="file"
                      id="example-images"
                      className="hidden"
                      onChange={handleImageUpload}
                      multiple
                    />
                    {images.length === 0 && (
                      <label htmlFor="example-images" className="flex items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg h-32 cursor-pointer dark:border-gray-600">
                        <div className="text-center">
                          <div className="flex flex-col items-center">
                            <UploadIcon className="h-6 w-6 text-gray-400 mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">Drag and drop files or click to upload</p>
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
                <Button type="button" onClick={() => document.getElementById('example-images')?.click()}>Add Images</Button>
              </form>
            </div>
          </section>
        </div>
      </main>
      {selectedImage && (
        <ImageDialog
          imageFile={selectedImage}
          isOpen={isDialogOpen}
          onClose={() => setDialogOpen(false)}
          boxes={userBoxes[selectedImage.name] || []}
          onAddBox={onBoxAdded}
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
  )
}
