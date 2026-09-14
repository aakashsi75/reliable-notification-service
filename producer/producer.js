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
        await publishToExchange(
        "notification.exchange",
        routingKey,
        notification,
        {
            persistent: true,
            headers: {
                "x-retry-count": 0
            }
        });
    }
    catch(error){
        console.error("Failed to publish notification",error);
        throw error;
    }
}

function publishToExchange(exchange,routingKey,message,options={}){
    return new Promise((resolve,reject)=>{
        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(message)),
            options,
            (error)=>{
                if(error){
                    reject(error);
                    return;
                }
                resolve();
            }
        );
    });
}

function sendToQueue(queue,message,options={}){
    return new Promise((resolve,reject)=>{
        channel.sendToQueue(
            queue,
            Buffer.from(JSON.stringify(message)),
            options,
            (error)=>{
                if(error){
                    reject(error);
                    return;
                }
                resolve();
            }
        );
    });
}


async function publishOutboxEvent(event) {
    const notification = event.payload;

    if (event.event_type === "NOTIFICATION_CREATED") {
        await publishNotification(notification);
        return;
    }

    if (event.event_type === "SMS_RETRY") {
        await sendToQueue(
            "sms.retry.queue",
            notification,
            {
                persistent: true,
                headers: {
                    "x-retry-count": notification.retryCount
                }
            }
        );
        return;
    }

    if (event.event_type === "EMAIL_RETRY") {
        await sendToQueue(
            "email.retry.queue",
            notification,
            {
                persistent: true,
                headers: {
                    "x-retry-count": notification.retryCount
                }
            }
        );

        return;
    }

    throw new Error(`Unknown outbox event type: ${event.event_type}`);
}

module.exports = {initializePublisher,publishNotification,publishOutboxEvent};