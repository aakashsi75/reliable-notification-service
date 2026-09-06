const { generateApiKey, hashApiKey } = require("../utils/apiKey");
const { createClient } = require("../db/clientRepository");

async function main() {
    const name = process.argv[2];
    if (!name) {
        console.log("Client name required");
        process.exit(1);
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    const client = await createClient(name, apiKeyHash);

    console.log("Client created:");
    console.log("ID:", client.id);
    console.log("Name:", client.name);
    console.log("API Key:", apiKey);

}

main();