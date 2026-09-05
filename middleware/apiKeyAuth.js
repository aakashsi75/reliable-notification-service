const crypto = require("crypto");
const {hashApiKey} = require("../utils/apiKey");
const {findClientByApiKeyHash} = require("../db/clientRepository");

async function apiKeyAuth(req,res,next){
    const apiKey = req.headers["x-api-key"];
    if(!apiKey){
        return res.status(401).json({
            error:"API Key required"
        })
    }
    const apiHashKey = hashApiKey(apiKey);
    const client = await findClientByApiKeyHash(apiHashKey);
    
    if(!client){
        return res.status(401).json({
            error: "Invalid API Key"
        })
    }
    req.clientId = client.id;
    next();
}

module.exports = apiKeyAuth;