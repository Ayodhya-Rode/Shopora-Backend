import { isValidEmail } from "../utils/validators.js";
import { sendMail } from "../utils/mailer.js";
import config from "../config/config.js";

export async function SubscribeNewsletter(req, res) {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    // notify admin of new subscriber
    await sendMail({
      to: config.contactReceiverEmail,
      subject: "New Newsletter Subscriber",
      html: `<p>New subscriber: <b>${email}</b></p>`,
    });

    // confirmation mail to subscriber
    await sendMail({
      to: email,
      subject: "You're subscribed to Shopora!",
      html: `<p>Thanks for subscribing! You'll now get early access to new arrivals and offers.</p>`,
    });

    return res.status(200).json({
      success: true,
      message: "Subscribed successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
}