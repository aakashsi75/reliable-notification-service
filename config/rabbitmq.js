const amqp = require("amqplib");

async function connectRabbitMQ() {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createConfirmChannel();

    return { connection, channel };
}

module.exports = connectRabbitMQ;
