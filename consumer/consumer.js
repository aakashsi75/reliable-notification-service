const amqp = require("amqplib");

async function main() {
    try {
        const connection = await amqp.connect("amqp://localhost");
        const channel = await connection.createChannel();
        channel.prefetch(1);
        await channel.assertQueue("email.queue",{
            durable: true
        });
        await channel.assertQueue("sms.queue",{
            durable: true
        });
        channel.consume("email.queue", (msg)=>{
            const email = JSON.parse(msg.content.toString());
            console.log(email);
            channel.ack(msg);
        },{
            noAck: false
        })
        channel.consume("sms.queue",(msg)=>{
            const sms = JSON.parse(msg.content.toString());
            console.log(sms);
            channel.ack(msg);
        },{
            noAck: false
        })
    } catch (error) {
        console.log(error);
    }
}

main();