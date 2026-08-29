const connectRabbitMQ = require("../config/rabbitmq");

async function main() {
    try {
        const { channel } = await connectRabbitMQ();

        await channel.assertQueue("email.queue", {
            durable: true
        });

        channel.prefetch(1);

        channel.consume("email.queue", (msg) => {
            const email = JSON.parse(msg.content.toString());

            console.log("EMAIL:", email);

            channel.ack(msg);
        }, {
            noAck: false
        });

    } catch (error) {
        console.log(error);
    }
}

main();