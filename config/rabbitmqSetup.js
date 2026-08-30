async function setup(channel){
    await channel.assertExchange("notification.exchange", "topic", {
        durable: true
    })
    await channel.assertExchange("notification.dlx", "topic",{
        durable: true
    })
    await channel.assertQueue("email.retry.queue",{
        durable: true,
        messageTtl: 5000,
        deadLetterExchange: "notification.exchange",
        deadLetterRoutingKey: "notification.email.security"
    })
    await channel.assertQueue("sms.retry.queue",{
        durable: true,
        messageTtl: 5000,
        deadLetterExchange: "notification.exchange",
        deadLetterRoutingKey: "notification.sms.otp"
    })
    await channel.assertQueue("email.queue", {
        durable: true,
        deadLetterExchange: "notification.dlx",
        deadLetterRoutingKey: "notification.email.failed"
    });
    await channel.assertQueue("sms.queue", {
        durable: true,
        deadLetterExchange: "notification.dlx",
        deadLetterRoutingKey: "notification.sms.failed"
    })
    await channel.assertQueue("audit.queue", {
        durable: true
    })
    await channel.assertQueue("email.dlq",{
        durable: true
    })
    await channel.assertQueue("sms.dlq",{
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
        "notification.dlx",
        "notification.email.failed"
    )
    await channel.bindQueue(
        "sms.dlq",
        "notification.dlx",
        "notification.sms.failed"
    )
    // * matches exactly 1 word
    // # matches 0 or more words

    console.log("Queue created and bound");
}

module.exports = { setup };