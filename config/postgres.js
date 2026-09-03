const { Pool } = require("pg");

const pool = new Pool({
    user: "notification_user",
    password: "notification_password",
    host: "localhost",
    port: "5432",
    database: "notification_db"
})

module.exports = pool;