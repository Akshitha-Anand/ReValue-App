"""
Waste Image Inference Engine
Validates image input, preprocesses to 224x224, and runs inference.
Uses trained MobileNetV2 weights when available, or visual feature analysis when weights are pending.
"""

import os
import io
import numpy as np
from PIL import Image

CATEGORIES = ["plastic", "paper", "metal", "glass", "organic", "ewaste"]

CATEGORY_TIPS = {
    "plastic": "Rinse containers and separate PET (#1) and HDPE (#2) bottles for highest recovery value.",
    "paper": "Keep completely dry and flat. Bundled office paper and cardboard fetch top scrap rates.",
    "metal": "Crush cans and separate ferrous (magnetic) from non-ferrous aluminum/copper.",
    "glass": "Keep bottles intact and sorted by color (clear, brown, green) for direct remelt reuse.",
    "organic": "Compost wet organic waste or deliver to local biomass anaerobic digestion centers.",
    "ewaste": "Remove batteries and do not dismantle PCBs manually to prevent hazardous leakage."
}

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "mobilenetv2_waste.keras")
H5_PATH = os.path.join(MODEL_DIR, "mobilenetv2_waste.h5")

_loaded_model = None

def get_loaded_model():
    """Attempts to load pre-trained weights if available on disk."""
    global _loaded_model
    if _loaded_model is not None:
        return _loaded_model

    target_path = MODEL_PATH if os.path.exists(MODEL_PATH) else (H5_PATH if os.path.exists(H5_PATH) else None)
    if target_path:
        try:
            import tensorflow as tf
            print(f"[*] Loading trained MobileNetV2 weights from: {target_path}")
            _loaded_model = tf.keras.models.load_model(target_path)
            return _loaded_model
        except Exception as e:
            print(f"[!] Warning: Failed to load model weights: {e}")
            return None
    return None

def validate_and_preprocess_image(image_bytes, max_size_mb=5.0):
    """
    Validates file size, integrity, and normalizes image to (224, 224, 3) RGB.
    """
    if not image_bytes or len(image_bytes) == 0:
        raise ValueError("Image file is empty")

    size_mb = len(image_bytes) / (1024 * 1024)
    if size_mb > max_size_mb:
        raise ValueError(f"Image size ({size_mb:.2f} MB) exceeds maximum allowed limit of {max_size_mb} MB")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img_format = img.format
        if img_format not in ["JPEG", "PNG", "WEBP", "MPO"]:
            raise ValueError(f"Unsupported image format: {img_format}. Please provide JPEG, PNG, or WEBP.")

        # Ensure image is valid by forcing load of image data
        img.load()
        orig_w, orig_h = img.size

        # Convert to RGB (handles RGBA, Grayscale, etc.)
        img_rgb = img.convert("RGB")
        resized_img = img_rgb.resize((224, 224), Image.Resampling.BILINEAR)

        # Normalize to float numpy array
        img_array = np.array(resized_img, dtype=np.float32)

        return img_array, {
            "format": img_format,
            "width": orig_w,
            "height": orig_h,
            "size_bytes": len(image_bytes)
        }
    except Exception as e:
        if isinstance(e, ValueError):
            raise e
        raise ValueError(f"Corrupted or unreadable image file: {str(e)}")

def extract_visual_features_fallback(img_array, hint_text=""):
    """
    When trained model weights have not yet been placed on disk, calculates genuine
    color histograms and edge frequencies to produce an initial prediction.
    """
    # Channel means and std deviations
    r_mean = np.mean(img_array[:, :, 0])
    g_mean = np.mean(img_array[:, :, 1])
    b_mean = np.mean(img_array[:, :, 2])

    # Convert to grayscale for edge/gradient variance
    gray = (0.2989 * img_array[:, :, 0] + 0.5870 * img_array[:, :, 1] + 0.1140 * img_array[:, :, 2])
    grad_x = np.diff(gray, axis=1)
    grad_y = np.diff(gray, axis=0)
    edge_density = (np.mean(np.abs(grad_x)) + np.mean(np.abs(grad_y))) / 2.0

    scores = {c: 0.15 for c in CATEGORIES}

    # Visual indicators
    # Metal/Electronic: high high-frequency edge density + neutral/silver color
    if edge_density > 18.0 and abs(r_mean - g_mean) < 15 and abs(g_mean - b_mean) < 15:
        scores["metal"] += 0.35
        scores["ewaste"] += 0.25
    # Glass / Plastic: high brightness / transparency / reflective
    if (r_mean + g_mean + b_mean) / 3 > 180:
        scores["plastic"] += 0.25
        scores["glass"] += 0.20
    # Organic: dominant green/brown (R and G > B)
    if g_mean > b_mean + 15 or (r_mean > b_mean + 20 and g_mean > b_mean):
        scores["organic"] += 0.35
    # Paper: high lightness, moderate texture
    if (r_mean + g_mean + b_mean) / 3 > 160 and edge_density < 14.0:
        scores["paper"] += 0.30

    # If user provided a title or hint in filename
    hint = hint_text.lower()
    for cat in CATEGORIES:
        if cat in hint:
            scores[cat] += 0.40

    # Softmax normalization
    exp_scores = {c: np.exp(s) for c, s in scores.items()}
    total_exp = sum(exp_scores.values())
    probs = {c: float(exp_scores[c] / total_exp) for c in CATEGORIES}

    sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
    top_cat, top_conf = sorted_probs[0]

    return top_cat, round(top_conf, 3), sorted_probs

def classify_waste_image(image_bytes, hint_text=""):
    """
    Main entry point for waste classification.
    """
    img_array, meta = validate_and_preprocess_image(image_bytes)

    model = get_loaded_model()
    if model is not None:
        import tensorflow as tf
        # MobileNetV2 preprocess: maps [0, 255] to [-1, 1]
        preprocessed = tf.keras.applications.mobilenet_v2.preprocess_input(np.expand_dims(img_array, axis=0))
        predictions = model.predict(preprocessed, verbose=0)[0]

        probs = {CATEGORIES[i]: float(predictions[i]) for i in range(len(CATEGORIES))}
        sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        top_cat, top_conf = sorted_probs[0]
        model_status = "mobilenetv2_trained"
    else:
        top_cat, top_conf, sorted_probs = extract_visual_features_fallback(img_array, hint_text)
        model_status = "feature_analysis_weights_pending"

    # Confidence thresholding: below 0.40 is considered low confidence
    is_confident = top_conf >= 0.40

    return {
        "success": True,
        "category": top_cat if is_confident else "unknown",
        "suggested_category": top_cat,
        "confidence": top_conf,
        "is_confident": is_confident,
        "model_status": model_status,
        "top_predictions": [{"category": c, "confidence": round(p, 3)} for c, p in sorted_probs[:3]],
        "recycling_tip": CATEGORY_TIPS.get(top_cat, "Please sort items properly before collection."),
        "image_metadata": meta,
        "requires_user_confirmation": True
    }
