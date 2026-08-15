// src/routes/contact.routes.js
import express from "express";
import { SendContactMessage } from "../controllers/contact.controller.js";

const router = express.Router();

router.post("/send", SendContactMessage);

export default router;