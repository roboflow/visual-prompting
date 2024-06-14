import io
import numpy as np
import supervision as sv
from supervision import Detections
import asyncio
import base64
import random
import string
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from PIL import Image as PILImage
from model.owlv2 import OurModel
from uuid import uuid4

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
async def startup_event():
    app.config_dict = {}
    app.fifo_queue = asyncio.Queue()
    asyncio.create_task(fifo_worker())

class BBox(BaseModel):
    w: float
    h: float
    x: float
    y: float

# [{image_contents: xxx, boxes: [{cls, bbox: {w, h, x, y}, confidence}]}]

class Box(BaseModel):
    cls: str
    bbox: BBox
    confidence: Optional[float] = 0.5

class Image(BaseModel):
    image_contents: str
    boxes: List[Box]

class InferenceRequest(BaseModel):
    model_id: str
    image_contents: str
    confidence_threshold: float = 0.1

class TrainResponse(BaseModel):
    message: str
    model_id: str

class InferResponse(BaseModel):
    message: str
    boxes: List[Box]

def to_pil_image(contents):
    image_bytes = io.BytesIO(base64.b64decode(contents.encode('utf-8')))
    return PILImage.open(image_bytes).convert("RGB")

async def fifo_worker():
    print("Starting DB Worker")
    while True:
        job = await app.fifo_queue.get()
        print(f"Got a job: (size of remaining queue: {app.fifo_queue.qsize()})")
        await job()
    
## TODO
async def deploy_model(images):
    uuid = str(uuid4())
    model = OurModel.create(images, uuid)
    return uuid

async def get_bboxes(model_id, pil_image, confidence):
    model = OurModel.load(model_id)
    boxes = model.infer(pil_image, confidence)
    w, h = pil_image.size
    width_ratio = w / max(w, h)
    height_ratio = h / max(w, h)
    out_boxes = []
    for box in boxes:
        out_boxes.append(Box(
            cls = box["class_name"],
            bbox = BBox(
                w=box["w"] / width_ratio,
                h=box["h"] / height_ratio,
                x=box["x"] / width_ratio,
                y=box["y"] / height_ratio,
            ),
            confidence = box["confidence"]
        ))
    return out_boxes

@app.post("/train", responses={200: {"model": TrainResponse}})
async def train(images: List[Image]):
    dict_image = [image.dict() for image in images]
    for i in dict_image:
        i["pil_contents"] = to_pil_image(i["image_contents"])

    future = asyncio.Future()
    async def task(dict_image=dict_image):
        # Do something with the images here
        try:
            for image in dict_image:
                pil_image = image["pil_contents"]
                box_dictionary = image["boxes"]
                w, h = pil_image.size
                width_ratio = w / max(w, h)
                height_ratio = h / max(w, h)
                for box in box_dictionary:
                    bbox = box["bbox"]
                    bbox["w"] *= width_ratio
                    bbox["h"] *= height_ratio
                    bbox["x"] *= width_ratio
                    bbox["y"] *= height_ratio

            result = await deploy_model(dict_image)
            future.set_result(result)
        except Exception as error:
            future.set_exception(error)
    
    await app.fifo_queue.put(task)
    model_id = await future
    # You can now access your images with the "images" variable
    # Do something with the images here
    return {
        "message": "Model Deployed!",
        "model_id": model_id
    }

@app.post("/infer", responses={200: {"model": InferResponse}})
async def infer(request: InferenceRequest):
    pil_image = to_pil_image(request.image_contents)
    
    future = asyncio.Future()
    
    async def task(model_id=request.model_id, pil_image=pil_image, confidence=request.confidence_threshold):
        # Do something with the images here
        try:
            result = await get_bboxes(model_id, pil_image, confidence)
            future.set_result(result)
        except Exception as error:
            future.set_exception(error)
    
    await app.fifo_queue.put(task)
    result = await future
    
    # You can now access your images with the "images" variable
    # Do something with the images here
    
    
    
    return {
        "message": "ran inference!",
        "boxes": result
    }
