const express = require("express");
const {createNotification} = require("../db/notificationRepository");
const {initializePublisher, publishNotification} = require("../producer/producer");
const apiKeyAuth = require("../middleware/apiKeyAuth");
const rateLimiter = require("../middleware/rateLimiter");
const app = express();

app.use(express.json());

app.post("/notifications",apiKeyAuth,rateLimiter,async(req,res)=>{
    try{
        const {type,recipient,content} = req.body;
        const idempotency_key = req.headers["idempotency_key"];
        if(!idempotency_key){
            res.status(400).json({
                error: "Idempotency Key Header Required"
            })
        }
        console.log(type,recipient,content);
        const notification = await createNotification(type,recipient,content,idempotency_key);
        await publishNotification(notification);
        res.status(201).json(notification);
    }
    catch(error){
        console.error("Failed to create notification", error);
        res.status(500).json({
            error: "Failed to create notification"
        })
    }
});

async function startServer(){
    try{
        await initializePublisher();
        app.listen(3000,()=>{
            console.log("server running");
        })
    }
    catch(error){
        console.error("failed to start server");
        throw error;
    }
}

startServer();