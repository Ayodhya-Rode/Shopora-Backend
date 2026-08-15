import Groq from "groq-sdk";
import config from "./config.js";

const groq = new Groq({
  apiKey: config.groqApiKey,
});

export default groq;