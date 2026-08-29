const connectRabbitMQ = require("../config/rabbitmq");

async function main() {
    try {
        const { channel } = await connectRabbitMQ();

        await channel.assertQueue("sms.queue", {
            durable: true
        });

        channel.prefetch(1);

        channel.consume("sms.queue", (msg) => {
            const sms = JSON.parse(msg.content.toString());

            console.log("SMS:", sms);

            channel.ack(msg);
        }, {
            noAck: false
        });

    } catch (error) {
        console.log(error);
    }
}

main();