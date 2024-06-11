import requests
import base64

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
    response = requests.post("http://150.136.41.107:80/train", json=body)
    print(response, response.text)


def test_infer():
    # do it on dog
    pass

test_train()