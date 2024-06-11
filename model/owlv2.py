from PIL import Image
import torchvision
from collections import defaultdict
import os
from transformers import Owlv2Processor, Owlv2ForObjectDetection
from transformers.models.owlv2.modeling_owlv2 import box_iou
import hashlib
import numpy as np
import torch


class OwlVitWrapper:
    def __init__(self, owl_name: str="google/owlv2-base-patch16-ensemble"):
        self.processor = Owlv2Processor.from_pretrained(owl_name)
        self.model = Owlv2ForObjectDetection.from_pretrained(owl_name)
        self.image_embed_cache = dict()  # NOTE: this should have a max size

    @torch.no_grad()
    def embed_image(self, image: Image.Image) -> "Hash":
        image_hash = hashlib.sha256(np.array(image).tobytes()).hexdigest()

        if (image_embeds := self.image_embed_cache.get(image_hash)) is not None:
            return image_hash

        pixel_values = self.processor(images=image, return_tensors="pt").pixel_values
        image_embeds, _ = self.model.image_embedder(pixel_values=pixel_values)
        batch_size, h, w, dim = image_embeds.shape
        image_features = image_embeds.reshape(batch_size, h * w, dim)
        objectnesses = model.objectness_predictor(image_features)
        boxes = model.box_predictor(image_features, feature_map=image_embeds)
        
        # class_embeddings =  model.class_predictor(image_features)[1]
        image_class_embeds = self.model.class_head.dense0(image_features)
        image_class_embeds /= torch.linalg.norm(image_class_embeds, dim=-1, keepdim=True) + 1e-6
        logit_shift = self.model.class_head.logit_shift(image_features)
        logit_scale = self.model.class_head.elu(self.model.class_head.logit_scale(image_features)) + 1
        objectness = objectness.sigmoid()

        self.image_embed_cache[image_hash] = (objectnesses.squeeze(0),
            boxes.squeeze(0),
            image_class_embeds.squeeze(0),
            logit_shift.squeeze(0),
            logit_scale.squeeze(0))

        return image_hash

    def get_query_embedding(self, query_spec: dict["Hash", list[list[int]]]):
        # NOTE: for now we're handling each image seperately
        query_embeds = []
        for image_hash, query_boxes in query_spec.items():
            try:
                objectness, image_boxes, image_class_embeds, _, _ = self.image_embed_cache[image_hash]
            except KeyError as error:
                raise KeyError("We didn't embed the image first!") from error
            
            query_boxes_tensor = torch.tensor(query_boxes, dtype=torch.float, device=image_boxes.device)
            iou, union = box_iou(image_boxes, query_boxes_tensor) # 3000, k
            iou_mask = iou > 0.3
            valid_objectness = torch.where(iou_mask, objectness.unsqueeze(-1), -1) # 3000, k
            indices = torch.argmax(valid_objectness, dim=0)
            embeds = image_class_embeds[indices]
            query_embeds.append(embeds)

        return torch.cat(query_embeds).mean(dim=0)

    def infer(self, image_hash: "Hash", query_embeddings, confidence):
        objectness, image_boxes, image_class_embeds, logit_shift, logit_scale = self.image_embed_cache[image_hash]
        predicted_boxes = []
        predicted_classes = []
        predicted_scores = []
        class_names = sorted(list(query_embeddings.keys()))
        class_map = {class_name: i for i, class_name in enumerate(class_names)}
        for class_name, embedding in query_embeddings.items():
            pred_logits = torch.einsum("...pd,...qd->...pq", image_class_embeds, embedding)
            pred_logits = (pred_logits + logit_shift) * logit_scale
            prediction_scores = pred_logits.sigmoid()
            score_mask = prediction_scores > confidence
            predicted_boxes.append(image_boxes[score_mask])
            scores = predicted_scores[score_mask]
            predicted_scores.append(scores)
            class_ind = class_map[class_name]
            predicted_classes.append(class_ind * torch.ones_like(scores))
        
        def to_corners(box):
            cx, cy, w, h = box.unbind(-1)
            x1 = cx - w / 2
            y1 = cy - h / 2
            x2 = cx + w / 2
            y2 = cy + h / 2
            return torch.stack([x1, y1, x2, y2], dim=-1)

        all_boxes = torch.cat(predicted_boxes, dim=0)
        all_classes = torch.cat(predicted_classes, dim=0)
        all_scores = torch.cat(predicted_scores, dim=0)
        survival_indices = torchvision.ops.nms(to_corners(all_boxes), all_scores, 0.3)
        pred_boxes = all_boxes[survival_indices].detach().cpu().numpy()
        pred_classes = all_classes[survival_indices].detach().cpu().numpy()
        pred_scores = all_scores[survival_indices].detach().cpu().numpy()
        return [
            {
                "class_name": class_names[c],
                "x": bbox[0],
                "y:" bbox[1],
                "w": bbox[2],
                "h": bbox[3],
                "confidence": score
            }
            for c, bbox, score in zip(pred_classes, pred_boxes, pred_scores)
        ]
        return class_preds


class OurModel:
    # { "class_name": QueryEmbedding }
    my_class_to_embeddings_dict: Dict[str, "Embedding"]
    my_owl_vit_interface: OwlVitWrapper
    id_
    json_spec
    def __init__(self, my_class_to_embeddings_dict, id_):
        self.id = id_
        self.my_class_to_embeddings_dict = my_class_to_embeddings_dict

    def infer(self, image, confidence):
        image_embedding = my_owl_vit_interface.embed_image(image)
        return my_owl_vit_interface.infer(
            image_embedding,
            self.my_class_to_embeddings_dict,
            confidence
        )

    @staticmethod
    def filename(uid):
        return os.path.join("models", str(uid) + ".pt")

    @classmethod
    def load(cls, uid):
        return torch.load(cls.filename(uid))

    def save(self):
        torch.save(self.filename(self.id_))

    @classmethod
    def create(cls, json_spec, uid, owl_vit: OwlVitWrapper):
        id_ = uid
        
        class_to_query_spec = defaultdict(lambda: defaultdict(list))
        for image_spec in json_spec:
            image: Image = image_spec["contents"]
            image_hash = owl_vit.embed_image(image)
            boxes = image_spec["boxes"]
            for box in boxes:
                class_name = box["class"]
                coords = box["x"], box["y"], box["w"], box["h"]
                class_to_query_spec[class_name][image_hash].append(coords)

        my_class_to_embeddings_dict = dict() 
        for class_name, query_spec in class_to_query_spec.items():
            class_embedding = owl_vit.get_query_embedding(query_spec)
            my_class_to_embeddings_dict[class_name] = class_embedding

        model = cls(my_class_to_embeddings_dict, id_)
        model.save()
        return model
