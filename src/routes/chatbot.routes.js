import express from "express";
import { ChatWithBot } from "../controllers/chatbot.controller.js";
import { optionalAuth } from "../middleware/authMiddleware.js";


const router = express.Router();

router.post("/message", optionalAuth, ChatWithBot);



export default router;