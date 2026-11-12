# ReValue AI Waste Classifier (MobileNetV2 Transfer Learning)

This module provides deep learning-based waste image classification for the ReValue platform using **MobileNetV2** transfer learning.

---

## 1. Supported Categories
- `plastic`
- `paper`
- `metal`
- `glass`
- `organic`
- `ewaste`

---

## 2. Dataset & Licensing
For training and fine-tuning, use one of the following open-access, appropriately licensed datasets:
1. **Stanford TrashNet Dataset** (Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)):
   - Classes: Glass, Paper, Cardboard, Plastic, Metal, Trash.
   - Link: https://github.com/garythung/trashnet
2. **Kaggle Waste Classification Dataset** (CC0 Public Domain):
   - Classes: Organic, Recyclable (Plastic, Paper, Metal, Glass, E-Waste).

### Organizing Dataset Directory:
```text
data/dataset/
  ├── plastic/
  ├── paper/
  ├── metal/
  ├── glass/
  ├── organic/
  └── ewaste/
```

---

## 3. Training & Evaluation Pipeline

To train the MobileNetV2 transfer learning model with data augmentation, train/validation/test split (70/15/15), and compute the classification report (Accuracy, Precision, Recall, F1-score, and Confusion Matrix):

```bash
python ml_service/train_classifier.py
```

The resulting model is saved to `ml_service/models/mobilenetv2_waste.keras`.

---

## 4. Running the Inference Service

Start the Flask microservice (port 5001):
```bash
python ml_service/server.py
```

Endpoints:
- `GET http://localhost:5001/health`
- `POST http://localhost:5001/predict` (multipart form with key `image`)

When `mobilenetv2_waste.keras` is placed in `models/`, the service automatically loads and uses the trained deep learning weights. If weights have not yet been trained, it performs real-time visual feature analysis and prompts the user for manual verification.
