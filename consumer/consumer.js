const amqp = require("amqplib");

async function main() {
    try {
        const connection = await amqp.connect("amqp://localhost");
        const channel = await connection.createChannel();
        channel.prefetch(1);
        await channel.assertQueue("notifications",{
            durable: true
        });
        channel.consume("notifications", (msg)=>{
            const message = msg.content.toString();
            console.log(message);
            channel.ack(msg);
        },{
            noAck: false
        })
    } catch (error) {
        console.log(error);
    }
}

main();