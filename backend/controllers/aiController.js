const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Classifies an uploaded waste image using Python ML service.
 * Supports MobileNetV2 when trained weights are installed, with visual feature analysis fallback.
 */
exports.classifyWasteImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file uploaded. Please upload a JPEG, PNG, or WEBP image."
            });
        }

        const filePath = req.file.path;
        const hintText = req.body.hint || req.file.originalname || "";

        // Path to ml_service/inference_cli.py
        const cliPath = path.resolve(__dirname, "../../ml_service/inference_cli.py");

        if (!fs.existsSync(cliPath)) {
            return res.status(500).json({
                success: false,
                message: "ML inference service script not found on server."
            });
        }

        // Spawn python process
        const pythonProcess = spawn("python", [cliPath, filePath, hintText]);

        let stdoutData = "";
        let stderrData = "";

        pythonProcess.stdout.on("data", (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on("close", (code) => {
            if (code !== 0 && !stdoutData) {
                console.error("Python inference error:", stderrData);
                return res.status(500).json({
                    success: false,
                    message: "Inference processing failed",
                    error: stderrData
                });
            }

            try {
                const parsed = JSON.parse(stdoutData.trim());
                if (!parsed.success) {
                    return res.status(400).json({
                        success: false,
                        message: parsed.error || "Image classification failed"
                    });
                }
                return res.json(parsed);
            } catch (jsonErr) {
                console.error("Failed to parse ML output:", stdoutData, jsonErr);
                return res.status(500).json({
                    success: false,
                    message: "Malformed response from ML inference engine",
                    raw: stdoutData
                });
            }
        });

    } catch (err) {
        console.error("Classification controller error:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error during classification",
            error: err.message
        });
    }
};
