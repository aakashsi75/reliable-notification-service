const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

async function sendEmail(notification){
    const response = await axios.post(
        "https://comms.twilio.com/v1/Emails",
        {
            from: {
                address: process.env.TWILIO_EMAIL_ADDRESS,
                name: "Trial from Twilio"
            },
            to: [{ address: "boombaam653@gmail.com" }],
            content: {
            subject: "Your Order Has Been Confirmed!",
            html: "<p><b>This is a test email from Twilio.</b></p><h2>Thank you for your order!</h2><p>We are excited to let you know that your order has been confirmed and is being processed.</p><p>You will receive a shipping confirmation email once your items are on their way.</p><p>Order Number: #12345</p><p>Thank you for shopping with us!</p><p>Best regards,<br/>The Team</p>",
            }
        },
        {
            auth:{
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            },
            headers: {
                "Content-Type": "application/json"
            }
        }
    )
    return response.data;
}

module.exports = sendEmail;