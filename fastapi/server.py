import io
import asyncio
import base64
import random
import string
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
from PIL import Image as PILImage
from model.owlv2 import OurModel
from uuid import uuid4

app = FastAPI()
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

class Box(BaseModel):
    cls: str
    bbox: BBox
    confidence: float

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
    return PILImage.open(image_bytes)

async def fifo_worker():
    print("Starting DB Worker")
    while True:
        job = await app.fifo_queue.get()
        print(f"Got a job: (size of remaining queue: {app.fifo_queue.qsize()})")
        await job()
    
## TODO
async def deploy_model(images):
    uuid = str(uuid4())
    model = OurModel.create(uuid, images.dict())
    return uuid

async def get_bboxes(model_id, pil_image, confidence):
    model = OurModel.load(model_id)
    boxes = model.infer(pil_image, confidence)
    for box in boxes:
        boxes.append(Box(
            cls = box["class_name"],
            bbox = BBox(
                w=box["w"],
                h=box["h"],
                x=box["x"],
                y=box["y"]
            ),
            confidence = box["confidence"]
        ))
    return boxes

@app.post("/train", responses={200: {"model": TrainResponse}})
async def train(images: List[Image]):
    dict_image = [image.dict() for image in images]
    for i in dict_image:
        i["pil_contents"] = to_pil_image(i["contents"])

    future = asyncio.Future()
    async def task(dict_image=dict_image):
        # Do something with the images here
        result = await deploy_model(dict_image)
        future.set_result(result)
    
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
    
    async def task(model_id=request.model_id, pil_image=pil_image, confidence=request.confidence):
        # Do something with the images here
        result = await get_bboxes(model_id, pil_image, confidence)
        future.set_result(result)
    
    await app.fifo_queue.put(task)
    result = await future
    
    # You can now access your images with the "images" variable
    # Do something with the images here
    
    
    
    return {
        "message": "ran inference!",
        "boxes": result
    }
