"""
Training & Evaluation Pipeline for MobileNetV2 Waste Classification
Dataset Recommendation:
- Stanford TrashNet (CC BY 4.0): https://github.com/garythung/trashnet
- Kaggle Waste Classification Dataset (CC0): Organic, Plastic, Paper, Metal, Glass, E-Waste

Splits: 70% Train, 15% Validation, 15% Test
Metrics: Accuracy, Precision, Recall, F1-Score, Confusion Matrix
"""

import os
import sys
import numpy as np

# Ensure root can import model
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from model import build_mobilenetv2_model, WASTE_CATEGORIES, NUM_CLASSES, IMAGE_SIZE

def train_and_evaluate(dataset_dir="data/dataset", output_dir="models", epochs=15, batch_size=32):
    """
    Executes training and evaluation using TensorFlow and Scikit-Learn.
    """
    if not os.path.exists(dataset_dir):
        print(f"[!] Dataset directory not found at: {dataset_dir}")
        print("    Please download a waste dataset (e.g. TrashNet) and arrange into class folders:")
        for cat in WASTE_CATEGORIES:
            print(f"      - {dataset_dir}/{cat}/")
        return False

    import tensorflow as tf
    from sklearn.metrics import classification_report, confusion_matrix

    os.makedirs(output_dir, exist_ok=True)
    model_save_path = os.path.join(output_dir, "mobilenetv2_waste.keras")

    print("[*] Loading and splitting dataset...")
    # Load dataset with 70% train, 15% val, 15% test splits
    full_ds = tf.keras.preprocessing.image_dataset_from_directory(
        dataset_dir,
        image_size=IMAGE_SIZE,
        batch_size=batch_size,
        label_mode="categorical",
        shuffle=True,
        seed=42
    )

    dataset_size = tf.data.experimental.cardinality(full_ds).numpy()
    train_size = int(0.70 * dataset_size)
    val_size = int(0.15 * dataset_size)
    test_size = dataset_size - train_size - val_size

    train_ds = full_ds.take(train_size)
    remaining_ds = full_ds.skip(train_size)
    val_ds = remaining_ds.take(val_size)
    test_ds = remaining_ds.skip(val_size)

    # Prefetch for performance
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)
    test_ds = test_ds.cache().prefetch(buffer_size=AUTOTUNE)

    # 1. Build Model
    print("[*] Initializing MobileNetV2 with pre-trained ImageNet backbone...")
    model = build_mobilenetv2_model(num_classes=NUM_CLASSES)

    # 2. Callbacks
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-6),
        tf.keras.callbacks.ModelCheckpoint(model_save_path, monitor="val_accuracy", save_best_only=True)
    ]

    # 3. Phase 1: Train Top Classification Head
    print(f"[*] Training top classification layers for {epochs} epochs...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        callbacks=callbacks
    )

    # 4. Phase 2: Fine-Tuning Top Backbone Layers
    print("[*] Fine-tuning top MobileNetV2 layers...")
    base_model = None
    for layer in model.layers:
        if "mobilenetv2" in layer.name.lower():
            base_model = layer
            break

    if base_model:
        base_model.trainable = True
        # Fine-tune only top 30 layers
        for layer in base_model.layers[:-30]:
            layer.trainable = False

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss="categorical_crossentropy",
            metrics=["accuracy", tf.keras.metrics.Precision(name="precision"), tf.keras.metrics.Recall(name="recall")]
        )
        model.fit(train_ds, validation_data=val_ds, epochs=5, callbacks=callbacks)

    # 5. Comprehensive Test Set Evaluation
    print("\n[*] Evaluating model on held-out test set...")
    y_true_list = []
    y_pred_list = []

    for images, labels in test_ds:
        preds = model.predict(images, verbose=0)
        y_true_list.extend(np.argmax(labels.numpy(), axis=1))
        y_pred_list.extend(np.argmax(preds, axis=1))

    y_true = np.array(y_true_list)
    y_pred = np.array(y_pred_list)

    print("\n" + "=" * 55)
    print("           REVALUE MODEL EVALUATION REPORT")
    print("=" * 55)
    report = classification_report(y_true, y_pred, target_names=WASTE_CATEGORIES, zero_division=0)
    print(report)

    cm = confusion_matrix(y_true, y_pred)
    print("\nConfusion Matrix:")
    print(cm)
    print("=" * 55)

    print(f"\n[+] Trained model saved successfully to: {model_save_path}")
    return True

if __name__ == "__main__":
    train_and_evaluate()
