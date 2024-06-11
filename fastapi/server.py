import io
import asyncio
import base64
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
from PIL import Image as PILImage

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
    class_: str
    bbox: BBox

class Image(BaseModel):
    contents: str
    boxes: List[Box]

class InferenceRequest(BaseModel):
    model_id: str
    image_contents: str

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
    print("TO BE IMPLEMENTED")
    return [{"sample": "bbox"}]

@app.post("/train")
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

@app.post("/infer")
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
    return {"message": "running inference!"}
