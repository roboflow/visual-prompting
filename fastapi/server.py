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
    w: int
    h: int
    x: int
    y: int

class Box(BaseModel):
    class_: str
    bbox: BBox

class Image(BaseModel):
    contents: str
    boxes: List[Box]

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

@app.post("/train")
async def train(images: List[Image]):
    
    model_id = deploy_model(images)
    # You can now access your images with the "images" variable
    # Do something with the images here
    return {
        "message": "Model Deployed!",
        "model_id": model_id
    }

@app.post("/infer")
async def infer(model_id: str, image_contents: str):
    image_bytes = io.BytesIO(base64.b64decode(image_contents.encode('utf-8')))
    pil_image = PILImage.open(image_bytes)
    
    future = asyncio.Future()
    
    async def task():
        # Do something with the images here
        await asyncio.sleep(10)
        result = "result of your task"
        future.set_result(result)
    
    await app.fifo_queue.put(task)
    result = await future
    
    # You can now access your images with the "images" variable
    # Do something with the images here
    return {"message": "running inference!"}
