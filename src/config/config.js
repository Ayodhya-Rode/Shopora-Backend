import dotenv from "dotenv";
dotenv.config();

// Required environment variables list
const requiredEnvVars = [
  "PORT",
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "IMAGEKIT_URL_ENDPOINT",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_PUBLIC_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "GROQ_API_KEY",
  "EMAIL_USER",
  "EMAIL_PASS",
  "CONTACT_RECEIVER_EMAIL",
];

// Checks all required variables are present in the environment
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const config = {
  port: process.env.PORT,
  mongoURI: process.env.MONGO_URI,
 jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
 jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  razorpayKey: process.env.RAZORPAY_KEY_ID,
  razorpaySecret: process.env.RAZORPAY_KEY_SECRET,
  groqApiKey: process.env.GROQ_API_KEY,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  contactReceiverEmail: process.env.CONTACT_RECEIVER_EMAIL,
};

export default config;
