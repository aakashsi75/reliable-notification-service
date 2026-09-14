const {getUnpublishedEvents,markEventAsPublished} = require("../db/notificationRepository");
const {initializePublisher,publishNotification,publishOutboxEvent} = require("../producer/producer");
const pool = require("../config/postgres");

async function processOutbox(){
    const client = await pool.connect();
    try{
        await client.query("BEGIN");
        const events = await getUnpublishedEvents(client);
        for(const event of events){
            const notification = event.payload;
            await publishNotification(notification);
            await markEventAsPublished(client,event.id);
            console.log(`Outbox event ${event.id} published successfully`);
        }
        await client.query("COMMIT");
    }
    catch(error){
        await client.query("ROLLBACK");
        console.error("Outbox transaction failed:", error);
        throw error;
    }
    finally{
        client.release();
    }
}

async function startRelay(){
    try{
        await initializePublisher();
        setInterval(async ()=>{
            try{
                await processOutbox();
            }
            catch(error){
                console.error("Outbox Processing Failed: ",error);
            }
        },1000);
    }
    catch(error){
        console.error("Failed to start Outbox Relay: ",error);
    }
}

startRelay();