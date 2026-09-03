const pool = require("../config/postgres");

async function createNotification(type,recipient,content){
    const query = `INSERT INTO notifications(type,recipient,content)
                    VALUES ($1,$2,$3)
                    RETURNING *`;
    
    const values = [type,recipient,content];
    const result = await pool.query(query,values);
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

async function recordAttempt(
    notificationId,
    attemptNumber,
    status,
    errorMessage = null
) {
    const query = `
        INSERT INTO notification_attempts
            (notification_id, attempt_number, status, error_message)
        VALUES
            ($1, $2, $3, $4)
        RETURNING *;
    `;

    const values = [
        notificationId,
        attemptNumber,
        status,
        errorMessage
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

module.exports = {createNotification,
                    updateNotification,
                    updateRetryCount,
                    recordAttempt   
};
