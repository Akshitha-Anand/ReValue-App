"""
MobileNetV2 Waste Classification Model Architecture
Uses Transfer Learning with MobileNetV2 as the feature extraction backbone.
"""

import os

# Categories supported by ReValue
WASTE_CATEGORIES = [
    "plastic",
    "paper",
    "metal",
    "glass",
    "organic",
    "ewaste"
]

NUM_CLASSES = len(WASTE_CATEGORIES)
IMAGE_SIZE = (224, 224)
INPUT_SHAPE = (224, 224, 3)

def build_mobilenetv2_model(num_classes=NUM_CLASSES, input_shape=INPUT_SHAPE, learning_rate=0.0001):
    """
    Constructs a transfer-learning classification model based on MobileNetV2.
    """
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, models
        from tensorflow.keras.applications import MobileNetV2

        # 1. Base Pretrained Backbone (MobileNetV2)
        base_model = MobileNetV2(
            input_shape=input_shape,
            include_top=False,
            weights="imagenet"
        )
        base_model.trainable = False  # Freeze backbone for initial training phase

        # 2. Data Augmentation Layers
        data_augmentation = tf.keras.Sequential([
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.15),
            layers.RandomZoom(0.1),
            layers.RandomContrast(0.1)
        ], name="data_augmentation")

        # 3. Model Definition
        inputs = layers.Input(shape=input_shape, name="input_image")
        x = data_augmentation(inputs)
        # MobileNetV2 expects pixel values in [-1, 1]
        x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
        x = base_model(x, training=False)
        x = layers.GlobalAveragePooling2D(name="global_avg_pool")(x)
        x = layers.BatchNormalization(name="batch_norm")(x)
        x = layers.Dropout(0.3, name="dropout_1")(x)
        x = layers.Dense(128, activation="relu", name="dense_features")(x)
        x = layers.Dropout(0.2, name="dropout_2")(x)
        outputs = layers.Dense(num_classes, activation="softmax", name="classification_output")(x)

        model = models.Model(inputs=inputs, outputs=outputs, name="ReValue_MobileNetV2")

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
            loss="categorical_crossentropy",
            metrics=["accuracy", tf.keras.metrics.Precision(name="precision"), tf.keras.metrics.Recall(name="recall")]
        )

        return model
    except ImportError:
        return None
