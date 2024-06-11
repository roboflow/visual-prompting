import io
import asyncio
import base64
import random
import string
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from PIL import Image as PILImage

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

class Box(BaseModel):
    cls: str
    bbox: BBox

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
def deploy_model(images):
    print("TO BE IMPLEMENTED")
    return "SAMPLE_UUID"

async def get_bboxes(model_id, pil_image):
    boxes = []
    
    for _ in range(random.randint(1, 5)):
        boxes.append(Box(
            cls = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5)),
            bbox = BBox(
                w=random.uniform(0, 0.25),
                h=random.uniform(0, 0.25),
                x=random.uniform(0.4, 0.6),
                y=random.uniform(0.4, 0.6)
            ),
        ))
    return boxes

@app.post("/train", responses={200: {"model": TrainResponse}})
async def train(images: List[Image]):
    dict_image = [image.dict() for image in images]
    for i in dict_image:
        i["pil_contents"] = to_pil_image(i["contents"])
    model_id = deploy_model(dict_image)
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
    
    async def task(model_id=request.model_id, pil_image=pil_image):
        # Do something with the images here
        result = await get_bboxes(model_id, pil_image)
        future.set_result(result)
    
    await app.fifo_queue.put(task)
    result = await future
    
    # You can now access your images with the "images" variable
    # Do something with the images here
    
    
    
    return {
        "message": "ran inference!",
        "boxes": result
    }
