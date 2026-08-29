const connectRabbitMQ = require("../config/rabbitmq");
const { emailNotification, smsNotification } = require("../events/notifications");

async function main(){
    try{
        const { connection, channel } = await connectRabbitMQ();
        await channel.assertExchange("notification.exchange","topic",{
            durable: true
        })
        const queue = await channel.assertQueue("email.queue",{
            durable: true
        });
        await channel.assertQueue("sms.queue",{
            durable: true
        })
        await channel.bindQueue(
            queue.queue,
            "notification.exchange",
            "notification.email"
        )
        await channel.bindQueue(
            "sms.queue",
            "notification.exchange",
            "notification.sms"
        )
        console.log("Queue created and bound");
        
        channel.publish("notification.exchange",
            "notification.email",
            Buffer.from(JSON.stringify(emailNotification)),{
                persistent:true
            }
        )
        channel.publish("notification.exchange",
            "notification.sms",
            Buffer.from(JSON.stringify(smsNotification)),{
                persistent: true
            }
        )
    } 
    catch(error){
        console.log(error);
    }
}

main();