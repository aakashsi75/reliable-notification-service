const amqp = require("amqplib");

async function main(){
    try{
        const connection = await amqp.connect("amqp://localhost");
        console.log("Connected to RabbitMQ!");
        const channel = await connection.createChannel();
        console.log("Channel created");
        const queue = await channel.assertQueue("notifications");
        console.log("Queue created");
        const message = "Hello RabbitMQ!";
        channel.sendToQueue(
            queue.queue,
            Buffer.from(message)
        )
    } 
    catch(error){
        console.log(error);
    }
}

main();