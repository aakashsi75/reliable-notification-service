const crypto = require("crypto");
const connectRedis = require("../config/redis");

const rateLimitScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowStart = now-60000
local limit = tonumber(ARGV[2])
local requestId = ARGV[3]

redis.call("ZREMRANGEBYSCORE",key,0,windowStart)

local count = redis.call("ZCARD",key)

if count >= limit then
    return 0
end

redis.call("ZADD",key,now,requestId)
redis.call("EXPIRE",key,60)

return 1
`

async function rateLimiter(req,res,next){
    try{
        const redis = await connectRedis();
        const key = `rate:${req.clientId}`;

        const now = Date.now();
        const requestId = crypto.randomUUID();

        const allowed = await redis.eval(rateLimitScript,{
            keys: [key],
            arguments: [
                now.toString(),
                "10",
                requestId
            ]
        });

        if(!allowed){
            return res.status(429).json({
                error: "Too many requests"
            });
        }
        next();
    }
    catch(error){
        console.log("Rate Limiter Error: ",error);
        return res.status(500).json({
            error: "Rate Limiter Failed"
        });
    }
}

module.exports = rateLimiter;