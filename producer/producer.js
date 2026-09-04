const connectRabbitMQ = require("../config/rabbitmq");
// const { emailNotification, smsNotification } = require("../events/notifications");
const { setup } = require("../config/rabbitmqSetup");

let channel;
let connection;

async function initializePublisher(){
    try{
        const rabbitMQ = await connectRabbitMQ();
        connection = rabbitMQ.connection;
        channel = rabbitMQ.channel;
        await setup(channel);
        console.log("RabbitMQ publisher ready");
    }
    catch(error){
        console.error("RabbitMQ publisher failed to initialize",error);
        throw error;
    }
}
async function publishNotification(notification){
    try{
        const routingKey = notification.type === "EMAIL" ? "notification.email.security" : "notification.sms.otp";
        channel.publish(
            "notification.exchange",
            routingKey,
            Buffer.from(JSON.stringify(notification)),
            {
                persistent: true,
                headers:{
                    "x-retry-count" : 0
                }
            }
        );
    } 
    catch(error){
        console.error("Failed to publish notification",error);
        throw error;
    }
}

module.exports = {initializePublisher,publishNotification};