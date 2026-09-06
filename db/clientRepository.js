const pool = require("../config/postgres");

async function createClient(name, apiKeyHash) {

    const query = `
        INSERT INTO api_clients (name, api_hash_key)
        VALUES ($1, $2)
        RETURNING id, name, created_at;
    `;

    const values = [name, apiKeyHash];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function findClientByApiKeyHash(apiKeyHash) {

    const query = `
        SELECT id, name
        FROM api_clients
        WHERE api_hash_key = $1;
    `;

    const values = [apiKeyHash];

    const result = await pool.query(query, values);

    return result.rows[0];
}

module.exports = {
    createClient,
    findClientByApiKeyHash
};