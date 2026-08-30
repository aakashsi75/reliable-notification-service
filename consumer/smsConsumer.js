const connectRabbitMQ = require("../config/rabbitmq");

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
        })

        channel.prefetch(1);

        channel.consume("sms.queue", (msg) => {
            const sms = JSON.parse(msg.content.toString());
            const retryCount = msg.properties.headers["x-retry-count"];
            console.log("SMS:", sms);
            console.log("RETRY-COUNT:", retryCount);
            const success = false;
            if (success) {
                channel.ack(msg);
                return;
            }
            else {
                if (retryCount >= 3) {
                    channel.publish(
                        "notification.dlx",
                        "notification.sms.failed",
                        msg.content,
                        {
                            persistent: true
                        }
                    );

                    channel.ack(msg);
                }
                else {
                    channel.sendToQueue("sms.retry.queue",
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
            }
        }, {
            noAck: false
        });

    } catch (error) {
        console.log(error);
    }
}

main();