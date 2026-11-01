const crypto = require("crypto");
const pool = require("../config/postgres");
const connectRabbitMQ = require("../config/rabbitmq");

const TOTAL_MESSAGES = 1000;

async function createNotifications(prefix) {
    const client = await pool.connect();
    const notifications = [];

    try {
        await client.query("BEGIN");

        for (let i = 0; i < TOTAL_MESSAGES; i++) {
            const idempotencyKey = `${prefix}${i}`;
            const result = await client.query(
                `
                INSERT INTO notifications(
                    type,
                    recipient,
                    content,
                    idempotency_key
                )
                VALUES($1, $2, $3, $4)
                RETURNING id, type, recipient, content, idempotency_key
                `,
                [
                    "EMAIL",
                    "benchmark@example.com",
                    "Worker benchmark",
                    idempotencyKey
                ]
            );

            notifications.push(result.rows[0]);
        }

        await client.query("COMMIT");

        return notifications;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}

async function publishNotifications(notifications) {
    const { connection, channel } = await connectRabbitMQ();


    return new Promise((resolve, reject) => {
        let published = 0;

        for (const notification of notifications) {
            channel.sendToQueue(
                "email.queue",
                Buffer.from(JSON.stringify(notification)),
                {
                    persistent: true,
                    headers: {
                        "x-retry-count": 0
                    }
                },
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    published++;

                    if (published === notifications.length) {
                        resolve();
                    }
                }
            );
        }
    });
}

async function waitForCompletion(prefix) {
    while (true) {
        const result = await pool.query(
            `
            SELECT COUNT(*) AS completed
            FROM notifications
            WHERE idempotency_key LIKE $1
              AND status = 'SENT'
            `,
            [`${prefix}%`]
        );

        const completed = Number(result.rows[0].completed);

        process.stdout.write(
            `\rCompleted: ${completed}/${TOTAL_MESSAGES}`
        );

        if (completed === TOTAL_MESSAGES) {
            console.log();
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function main() {
    const prefix = `worker-benchmark-${crypto.randomUUID()}-`;

    try {
        console.log(`Creating ${TOTAL_MESSAGES} notifications...`);

        const notifications = await createNotifications(prefix);

        console.log("Publishing to email.queue...");

        await publishNotifications(notifications);

        console.log("All messages published.");
        console.log("Waiting for email workers...");

        const start = process.hrtime.bigint();

        await waitForCompletion(prefix);

        const end = process.hrtime.bigint();

        const elapsedSeconds =
            Number(end - start) / 1_000_000_000;

        const throughput =
            TOTAL_MESSAGES / elapsedSeconds;

        console.log("\nWORKER BENCHMARK");
        console.log("-----------------");
        console.log(`Messages:   ${TOTAL_MESSAGES}`);
        console.log(`Time:       ${elapsedSeconds.toFixed(2)} seconds`);
        console.log(`Throughput: ${throughput.toFixed(2)} notifications/sec`);

        process.exit(0);
    }
    catch (error) {
        console.error("\nBenchmark failed:", error);
        process.exit(1);
    }
}

main();