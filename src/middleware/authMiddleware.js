import jwt from "jsonwebtoken";
import config from "../config/config.js";


//check token is valid or not
export const protect = (req, res, next) => {
    
    let token; 

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, config.jwtAccessSecret);
            req.user = decoded; // { id, role }
            next();
        } catch (error) {
            return res.status(401).json({ message: "Access token expired or invalid" });
        }
    } else {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};


// checks role of logged in person
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
};


// used for routes that work for both guests and logged-in users (e.g. chatbot)
export const optionalAuth = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, config.jwtAccessSecret);
      req.user = decoded; // { id, role }
    } catch (error) {
      req.user = null; // invalid/expired token — treat as guest, don't block
    }
  } else {
    req.user = null; // no token — guest
  }

  next();
};