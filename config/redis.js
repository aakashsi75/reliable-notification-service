const {createClient} = require("redis");
const client = createClient({
    url: "redis://localhost:6379"
})

client.on("error",(error)=>{
    console.error("Redis Client Error: ",error);
});

async function connectRedis(){
    if(!client.isOpen){
        await client.connect();
        console.log("Redis Connected");
    }
    return client;
}

module.exports = connectRedis;