async function setup(channel){
    await channel.assertExchange("notification.exchange", "topic", {
        durable: true
    })
    await channel.assertQueue("email.queue", {
        durable: true
    });
    await channel.assertQueue("sms.queue", {
        durable: true
    })
    await channel.assertQueue("audit.queue", {
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
    // * matches exactly 1 word
    // # matches 0 or more words

    console.log("Queue created and bound");
}

module.exports = { setup };