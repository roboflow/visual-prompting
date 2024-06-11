

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI()
@app.on_event("startup")
async def startup_event():
    app.config_dict = {}

class Box(BaseModel):
    class_: str
    bbox: List[int]

class Image(BaseModel):
    contents: str
    boxes: List[Box]

@app.post("/train")
async def train(images: List[Image]):
    print(images)
    # You can now access your images with the "images" variable
    # Do something with the images here
    return {"message": "Images received!"}

@app.post("/infer")
async def infer(model_id: str):
    # You can now access your images with the "images" variable
    # Do something with the images here
    return {"message": "running inference!"}
