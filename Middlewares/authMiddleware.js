const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
const token = req.headers.authorization?.split(" ")[1]; // Get token from "Bearer <token>"

    if (!token) {
        return res.status(403).json("Access Denied: No Token Provided!");
    }

    try {
        const verified = jwt.verify(token, process.env.SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json("Invalid or expired token");
    }
};

module.exports = verifyToken;