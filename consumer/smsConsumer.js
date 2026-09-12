const connectRabbitMQ = require("../config/rabbitmq");
const {
    claimAttempt,
    updateAttempt,
    updateNotification,
    updateRetryCount
} = require("../db/notificationRepository");

async function main() {
    try {
        const { channel } = await connectRabbitMQ();

        await channel.assertQueue("sms.queue", {
            durable: true,
            deadLetterExchange: "notification.dlx",
            deadLetterRoutingKey: "notification.sms.failed"
        });

        await channel.assertQueue("sms.retry.queue", {
            durable: true,
            messageTtl: 5000,
            deadLetterExchange: "notification.exchange",
            deadLetterRoutingKey: "notification.sms.otp"
        });

        channel.prefetch(1);

        channel.consume("sms.queue", async (msg) => {
            try {
                const sms = JSON.parse(msg.content.toString());
                const retryCount = msg.properties.headers?.["x-retry-count"] || 0;
                const attemptNumber = retryCount + 1;
                const attempt = await claimAttempt(
                    sms.id,
                    attemptNumber
                );

                if (!attempt) {
                    console.log(
                        `Duplicate attempt ${attemptNumber} for notification ${sms.id}`
                    );
                    channel.ack(msg);
                    return;
                }

                console.log("SMS:", sms);
                console.log("RETRY-COUNT:", retryCount);

                const success = false;

                if (success) {
                    await updateAttempt(
                        sms.id,
                        attemptNumber,
                        "SUCCESS"
                    );

                    await updateNotification(
                        sms.id,
                        "SENT"
                    );

                    channel.ack(msg);
                    return;
                }

                await updateAttempt(
                    sms.id,
                    attemptNumber,
                    "FAILED",
                    "SMS provider failed"
                );

                if (retryCount >= 3) {
                    await updateNotification(
                        sms.id,
                        "FAILED",
                        "SMS provider failed"
                    );

                    channel.reject(msg, false);
                    return;
                }

                await updateRetryCount(
                    sms.id,
                    retryCount + 1
                );

                channel.sendToQueue(
                    "sms.retry.queue",
                    msg.content,
                    {
                        persistent: true,
                        headers: {
                            "x-retry-count": retryCount + 1
                        }
                    }
                );

                channel.ack(msg);

            } catch (error) {
                console.error("SMS Worker Error:", error);
                channel.reject(msg, false);
            }
        }, {
            noAck: false
        });

    } catch (error) {
        console.log(error);
    }
}

main();