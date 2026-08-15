import jwt from "jsonwebtoken";
import config from "../config/config.js";

//access token -> 15 min
export const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, config.jwtAccessSecret, {
    expiresIn: "15m",
  });
};

//refresh token -> 7d
export const generateRefreshToken = (id, role) => {
  return jwt.sign({ id, role }, config.jwtRefreshSecret, {
    expiresIn: "7d",
  });
};