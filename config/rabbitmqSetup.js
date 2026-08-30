async function setup(channel){
    await channel.assertExchange("notification.exchange", "topic", {
        durable: true
    })
    await channel.assertExchange("email.dlx", "direct",{
        durable: true
    })
    await channel.assertQueue("email.retry.queue",{
        durable: true,
        messageTtl: 5000,
        deadLetterExchange: "notification.exchange",
        deadLetterRoutingKey: "notification.email.security"
    })
    await channel.assertQueue("email.queue", {
        durable: true,
        deadLetterExchange: "email.dlx",
        deadLetterRoutingKey: "email.failed"
    });
    await channel.assertQueue("sms.queue", {
        durable: true
    })
    await channel.assertQueue("audit.queue", {
        durable: true
    })
    await channel.assertQueue("email.dlq",{
        durable: true
    })
    await channel.bindQueue(
        "email.queue",
        "notification.exchange",
        "notification.email.*"
    )
    await channel.bindQueue(
        "sms.queue",
        "notification.exchange",
        "notification.sms.*"
    )
    await channel.bindQueue(
        "audit.queue",
        "notification.exchange",
        "notification.#"
    )
    await channel.bindQueue(
        "email.dlq",
        "email.dlx",
        "email.failed"
    )
    // * matches exactly 1 word
    // # matches 0 or more words

    console.log("Queue created and bound");
}

module.exports = { setup };