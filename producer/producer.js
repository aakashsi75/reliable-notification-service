const connectRabbitMQ = require("../config/rabbitmq");
const { emailNotification, smsNotification } = require("../events/notifications");
const { setup } = require("../config/rabbitmqSetup");

async function main(){
    try{
        const { channel } = await connectRabbitMQ();
        await setup(channel);
        channel.publish("notification.exchange",
            "notification.email.security",
            Buffer.from(JSON.stringify(emailNotification)),{
                persistent:true,
                headers: {
                    "x-retry-count":0
                }
            }
        )
        channel.publish("notification.exchange",
            "notification.sms.otp",
            Buffer.from(JSON.stringify(smsNotification)),{
                persistent:true,
                headers: {
                    "x-retry-count":0
                }
            }
        )
    } 
    catch(error){
        console.log(error);
    }
}

main();