const pool = require("../config/postgres");

async function createNotificationWithOutbox(type,recipient,content,idempotency_key){
    const client = await pool.connect();
    try{
        await client.query("BEGIN");
        const insertNotification = `INSERT INTO notifications(type,recipient,content,idempotency_key)
                        VALUES ($1,$2,$3,$4)
                        ON CONFLICT(idempotency_key)
                        DO NOTHING
                        RETURNING *`;
        const notificationValues = [type,recipient,content,idempotency_key];
        const notificationResult = await client.query(insertNotification,notificationValues);
        if(notificationResult.rows.length == 0) {
            await client.query("ROLLBACK");
            return findNotificationByIdempotencyKey(idempotency_key);
        }
        const notification = notificationResult.rows[0];
        const insertOutbox = `INSERT INTO outbox_events(notification_id,payload,event_type)
                                VALUES ($1,$2,$3)
                                RETURNING *`;
        const outboxValues = [notification.id,JSON.stringify(notification),"NOTIFICATION_CREATED"];
        const outbox = await client.query(insertOutbox,outboxValues);
        await client.query("COMMIT");
        return notification;
    }
    catch(error){
        await client.query("ROLLBACK");
        throw error;
    }
    finally{
        client.release();
    }
}

// async function createNotification(type,recipient,content,idempotency_key){
//     const query = `INSERT INTO notifications(type,recipient,content,idempotency_key)
//                     VALUES ($1,$2,$3,$4)
//                     ON CONFLICT(idempotency_key)
//                     DO NOTHING
//                     RETURNING *`;
//     const values = [type,recipient,content,idempotency_key];
//     const result = await pool.query(query,values);
//     if(result.rows.length > 0) return result.rows[0];
//     return findNotificationByIdempotencyKey(idempotency_key);
// }

async function findNotificationByIdempotencyKey(idempotency_key){
    const query = `SELECT *
                    FROM notifications
                    where idempotency_key = $1`;
    
    const result = await pool.query(query,[idempotency_key]);

    return result.rows[0];
}

async function updateNotification(id,status,errorMessage = null){
    const query = `UPDATE notifications
                    SET
                        status = $1,
                        error_message = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                    RETURNING *;`

    const values = [status,errorMessage,id];
    const result = await pool.query(query,values);
    return result.rows[0];
}

async function updateRetryCount(id,retrycount){
    const query = `UPDATE notifications
                    SET
                        retry_count = $1
                    WHERE id = $2
                    RETURNING *;`
    
    const values = [retrycount,id];
    const result = await pool.query(query,values);
    return result.rows[0];
}

// async function recordAttempt(
//     notificationId,
//     attemptNumber,
//     status,
//     errorMessage = null
// ) {
//     const query = `
//         INSERT INTO notification_attempts
//             (notification_id, attempt_number, status, error_message)
//         VALUES
//             ($1, $2, $3, $4)
//         RETURNING *;
//     `;

//     const values = [
//         notificationId,
//         attemptNumber,
//         status,
//         errorMessage
//     ];

//     const result = await pool.query(query, values);

//     return result.rows[0];
// }

async function claimAttempt(notificationId, attemptNumber){
    const query = `
        INSERT INTO notification_attempts
            (notification_id, attempt_number, status)
        VALUES
            ($1, $2, 'PROCESSING')
        ON CONFLICT (notification_id, attempt_number)
        DO UPDATE
        SET status = notification_attempts.status
        RETURNING *;
    `;

    const result = await pool.query(
        query,
        [notificationId, attemptNumber]
    );

    return result.rows[0];
}

async function updateAttempt(
    notificationId,
    attemptNumber,
    status,
    errorMessage = null
){
    const query = `
        UPDATE notification_attempts
        SET
            status = $1,
            error_message = $2
        WHERE notification_id = $3
          AND attempt_number = $4
        RETURNING *;
    `;

    const values = [
        status,
        errorMessage,
        notificationId,
        attemptNumber
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function getUnpublishedEvents(client){
    const query = `SELECT *
                    FROM outbox_events
                    where published = false
                    ORDER BY id
                    LIMIT 10
                    FOR UPDATE SKIP LOCKED;`;

    const result = await client.query(query);
    return result.rows;
}

async function markEventAsPublished(client,id){
    const query = `UPDATE outbox_events
                    SET
                        published = TRUE,
                        published_at = CURRENT_TIMESTAMP
                    where id = $1;`;
    
    await client.query(query,[id]);
}

async function claimNotification(id){
    const query = `
        UPDATE notifications
        SET
            status = 'PROCESSING',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'PENDING'
        RETURNING *;
    `;

    const result = await pool.query(query,[id]);

    return result.rows[0];
}

module.exports = {createNotificationWithOutbox,
                    updateNotification,
                    updateRetryCount,
                    claimAttempt,
                    updateAttempt,
                    findNotificationByIdempotencyKey,
                    getUnpublishedEvents,
                    markEventAsPublished,
                    claimNotification
};