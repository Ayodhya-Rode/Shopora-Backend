// src/routes/newsletter.routes.js
import express from "express";
import { SubscribeNewsletter } from "../controllers/newsletter.controller.js";

const router = express.Router();

router.post("/subscribe", SubscribeNewsletter);

export default router;