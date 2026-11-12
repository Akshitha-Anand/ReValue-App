const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader) return res.status(401).json({ message: "No token, authorization denied" });

        const rawToken = authHeader.replace(/^Bearer\s+/i, "").trim();
        const secret = process.env.JWT_SECRET || "your_jwt_secret";

        let decoded;
        try {
            decoded = jwt.verify(rawToken, secret);
        } catch (e) {
            // Support legacy fallback secret if configured differently
            decoded = jwt.verify(rawToken, "secret");
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = authMiddleware;
