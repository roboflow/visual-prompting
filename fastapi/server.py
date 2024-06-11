print("hello world")

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

class Image(BaseModel):
    image: str

@app.post("/train")
async def train(images: List[Image]):
    # You can now access your images with the "images" variable
    # Do something with the images here
    return {"message": "Images received!"}

@app.post("/infer")
async def train(model_id: str):
    # You can now access your images with the "images" variable
    # Do something with the images here
    return {"message": "running inference!"}
