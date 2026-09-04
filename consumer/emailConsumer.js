const connectRabbitMQ = require("../config/rabbitmq");
const {updateNotification, recordAttempt, updateRetryCount} = require("../db/notificationRepository");

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
            const email = JSON.parse(msg.content.toString());
            await updateNotification(email.id,"PROCESSING");
            const retryCount = msg.properties.headers?.["x-retry-count"] || 0;
            console.log("EMAIL:", email);
            console.log("RETRY-COUNT:", retryCount);
            const success = false;
            if (success) {
                await recordAttempt(email.id,retryCount+1,"SUCCESS");
                await updateNotification(email.id,"SENT");
                channel.ack(msg);
                return;
            }
            if (retryCount >= 3) {
                await recordAttempt(email.id, retryCount+1,"FAILED","Email provider failed");
                await updateNotification(email.id,"FAILED","Email provider failed");
                channel.reject(msg,false);
                return;
            }
            else {
                await recordAttempt(email.id,retryCount+1,"FAILED","Email provider failed");
                await updateRetryCount(email.id,retryCount+1);
                channel.sendToQueue(
                    "email.retry.queue",
                    msg.content,
                    {
                        persistent: true,
                        headers: {
                            "x-retry-count": retryCount + 1
                        }
                    }
                )
                channel.ack(msg);
            }
        }, {
            noAck: false
        });

    } catch (error) {
        console.log(error);
    }
}

main();