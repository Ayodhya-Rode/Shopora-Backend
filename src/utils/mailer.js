import nodemailer from "nodemailer";
import config from "../config/config.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.emailUser,
    pass: config.emailPass,
  },
});

export async function sendMail({ to, subject, html, replyTo }) {
   const info = await transporter.sendMail({
    from: `"Shopora" <${config.emailUser}>`,
    to,
    subject,
    html,
    replyTo,
  });
  console.log("✅ Mail sent:", info.messageId, info.response);
  return info;
}