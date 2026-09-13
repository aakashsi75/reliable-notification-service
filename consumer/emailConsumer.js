const connectRabbitMQ = require("../config/rabbitmq");

const {
    updateNotification,
    updateAttempt,
    updateRetryCount,
    claimAttempt
} = require("../db/notificationRepository");

const sendEmail = require("../providers/emailProvider");

async function main() {
    try {
        const { channel } = await connectRabbitMQ();

        await channel.assertQueue("email.queue", {
            durable: true,
            deadLetterExchange: "notification.dlx",
            deadLetterRoutingKey: "notification.email.failed"
        });
        await channel.assertQueue("email.retry.queue", {
            durable: true,
            messageTtl: 5000,
            deadLetterExchange: "notification.exchange",
            deadLetterRoutingKey: "notification.email.security"
        })
        channel.prefetch(1);

        channel.consume("email.queue", async (msg) => {
            try {
                const email = JSON.parse(msg.content.toString());
                const retryCount = msg.properties.headers?.["x-retry-count"] || 0;
                const attemptNumber = retryCount + 1;
                const attempt = await claimAttempt(
                    email.id,
                    attemptNumber
                );

                if (attempt.status === "SUCCESS") {
                    console.log(
                        `Attempt ${attemptNumber} already succeeded for notification ${email.id}`
                    );

                    channel.ack(msg);
                    return;
                }

                if (attempt.status === "FAILED") {
                    console.log(
                        `Attempt ${attemptNumber} already failed for notification ${email.id}`
                    );

                    channel.ack(msg);
                    return;
                }

                console.log(
                    `Processing attempt ${attemptNumber} for notification ${email.id}`
                );
                console.log("EMAIL:", email);
                console.log("RETRY-COUNT:", retryCount);
                try{
                    await sendEmail(email)
                    await updateAttempt(
                        email.id,
                        attemptNumber,
                        "SUCCESS"
                    );
                    await updateNotification(
                        email.id,
                        "SENT"
                    );
                    channel.ack(msg);
                    return;
                }
                catch(error){
                    console.error("Email provider error: ",error);
                    await updateAttempt(
                        email.id,
                        attemptNumber,
                        "FAILED",
                        error.message
                    );
                }

                if (retryCount >= 3) {
                    await updateNotification(
                        email.id,
                        "FAILED",
                        "Email provider failed"
                    );

                    channel.reject(msg, false);
                    return;
                }

                await updateRetryCount(
                    email.id,
                    retryCount + 1
                );

                channel.sendToQueue(
                    "email.retry.queue",
                    msg.content,
                    {
                        persistent: true,
                        headers: {
                            "x-retry-count": retryCount + 1
                        }
                    }
                );

                channel.ack(msg);

            }
            catch (error) {
                console.error("Email Worker Error:", error);
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