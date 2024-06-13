import numpy as np
import supervision as sv
from supervision import Detections
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
            "w": 0.75,
            "h": 0.7,
            "x": 0.5,
            "y": 0.55
        }
    }]
    body = [{
        "image_contents": encoded_string,
        "boxes": boxes
    }]
    image = np.asarray(Image.open("golden_dog.jpg"))
    class_ids = []
    xyxy = []
    confidence = []
    for detection in boxes:
        class_ids.append(0)
        detection = detection["bbox"]
        x1 = (detection['x'] - detection['w'] / 2) * image.shape[1]
        y1 = (detection['y'] - detection['h'] / 2) * image.shape[0]
        x2 = (detection['x'] + detection['w'] / 2) * image.shape[1]
        y2 = (detection['y'] + detection['h'] / 2) * image.shape[0]
        xyxy.append([x1, y1, x2, y2])
        confidence.append(1)

    xyxy = np.array(xyxy)
    confidence = np.array(confidence)
    class_ids = np.array(class_ids)

    # Create the Detections object
    detections = Detections(class_id=class_ids, confidence=confidence, xyxy=xyxy)
    bounding_box_annotator = sv.BoundingBoxAnnotator()
    annotated_frame = bounding_box_annotator.annotate(
        scene=image.copy(),
        detections=detections
    )
    Image.fromarray(annotated_frame).save("anno.jpg")

    response = requests.post("http://150.136.41.107:80/train", json=body)
    print(response, response.text)
    return response.json()["model_id"]


def test_infer(model_id):
    with open("dogs.jpeg", "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    body = {
        "model_id": model_id,
        "image_contents": encoded_string,
        "confidence_threshold": 0.9
    }
    response = requests.post("http://150.136.41.107:80/infer", json=body)
    json_response = response.json()
    boxes = json_response["boxes"]
    import supervision as sv
    from supervision.detection.core import Detections
    import numpy as np

    class_ids = []
    xyxy = []
    confidence = []

    image = np.asarray(Image.open("dogs.jpeg"))
    sorted(boxes, key=lambda z: -z["confidence"])
    for detection in boxes:
        class_ids.append(0)
        height, width, _ = image.shape
        confidence.append(detection['confidence'])
        print(height, width)
        detection = detection["bbox"]
        x1 = (detection['x'] - detection['w'] / 2) * width
        y1 = (detection['y'] - detection['h'] / 2) * height
        x2 = (detection['x'] + detection['w'] / 2) * width
        y2 = (detection['y'] + detection['h'] / 2) * height
        xyxy.append([x1, y1, x2, y2])
        print(confidence)

    xyxy = np.array(xyxy)
    confidence = np.array(confidence)
    class_ids = np.array(class_ids)

    # Create the Detections object
    detections = Detections(class_id=class_ids, confidence=confidence, xyxy=xyxy)
    bounding_box_annotator = sv.BoundingBoxAnnotator()
    annotated_frame = bounding_box_annotator.annotate(
        scene=image.copy(),
        detections=detections
    )
    Image.fromarray(annotated_frame).save("preds.jpg")

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