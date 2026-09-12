const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
)

async function sendSms(notification){
    const message = await client.messages.create({
        body: "sms_event_notifications",
        from: process.env.TWILIO_PHONE_NUMBER,
        to: notification.recipient
    });
    return message;
}

module.exports = sendSms;