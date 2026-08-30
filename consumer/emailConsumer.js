const connectRabbitMQ = require("../config/rabbitmq");

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

        channel.consume("email.queue", (msg) => {
            const email = JSON.parse(msg.content.toString());
            const retryCount = msg.properties.headers?.["x-retry-count"] || 0;
            console.log("EMAIL:", email);
            console.log("RETRY-COUNT:", retryCount);
            const success = false;
            if (success) {
                channel.ack(msg);
                return;
            }
            if (retryCount >= 3) {
                channel.publish(
                    "notification.dlx",
                    "notification.email.failed",
                    msg.content,
                    {
                        persistent: true
                    }
                );
                channel.ack(msg);
            }
            else {
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

            // channel.ack(msg);
            // channel.reject(msg,false);
        }, {
            noAck: false
        });

    } catch (error) {
        console.log(error);
    }
}

main();