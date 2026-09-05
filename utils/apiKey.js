const crypto = require("crypto");

function generateApiKey(){
    return crypto.randomBytes(32).toString("hex");
}

function hashApiKey(apiKey){
    const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
    return hash;
}

module.exports = {
    generateApiKey,
    hashApiKey
};