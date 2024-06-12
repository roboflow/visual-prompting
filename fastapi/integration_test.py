import requests
import base64
from PIL import Image, ImageDraw

def test_train():
    # do it on golden dog
    with open("golden_dog.jpg", "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    boxes = [{
        "cls": "dog",
        "bbox": {
            "w": 1,
            "h": 1,
            "x": 0.5,
            "y": 0.5
        }
    }]
    body = [{
        "image_contents": encoded_string,
        "boxes": boxes
    }]
    response = requests.post("http://150.136.41.107:81/train", json=body)
    print(response, response.text)
    return response.json()["model_id"]


def test_infer(model_id):
    with open("dog.jpg", "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    body = {
        "model_id": model_id,
        "image_contents": encoded_string,
        "confidence_threshold": 0.5
    }
    response = requests.post("http://150.136.41.107:81/infer", json=body)
    json_response = response.json()
    print(json_response)

    # bboxes = json_response['boxes']
    # image = Image.open("dog.jpg")
    # draw = ImageDraw.Draw(image)

    # for box in bboxes:
    #     bbox = box['bbox']
    #     left = bbox['x'] * image.width
    #     top = bbox['y'] * image.height
    #     right = (bbox['x'] + bbox['w']) * image.width
    #     bottom = (bbox['y'] + bbox['h']) * image.height
    #     draw.rectangle(((left, top), (right, bottom)), outline="red")

    # image.save("dog_with_boxes.jpg")

model_id = test_train()
test_infer(model_id)