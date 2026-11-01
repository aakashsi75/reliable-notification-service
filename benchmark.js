const autocannon = require("autocannon");
const crypto = require("crypto");

const API_KEY = "7289713985277af04ce2593ccd2de140147decacbf1650458a94f35247e2d8bd";

const instance = autocannon({
    url: "http://localhost:3000",
    connections: 50,
    duration: 10,
    renderStatusCodes: true,

    requests: [
        {
            method: "POST",
            path: "/notifications",

            setupRequest: (req) => {
                req.headers["x-api-key"] = API_KEY;
                req.headers["idempotency-key"] = crypto.randomUUID();
                req.headers["content-type"] = "application/json";

                req.body = JSON.stringify({
                    type: "EMAIL",
                    recipient: "benchmark@example.com",
                    content: "Benchmark notification"
                });

                return req;
            }
        }
    ]
});

autocannon.track(instance);

instance.on("done", (result) => {
    console.log("\nSTATUS CODES:");
    console.log(result.statusCodeStats);
});