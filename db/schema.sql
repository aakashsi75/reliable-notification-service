CREATE TABLE notifications(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    type VARCHAR(10) NOT NULL
        CHECK(type in ('SMS','EMAIL')),
    recipient VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_attempts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notification_id BIGINT NOT NULL,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(10) NOT NULL
        CHECK (status IN ('PROCESSING', 'SUCCESS', 'FAILED')),
    error_message TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification
        FOREIGN KEY (notification_id)
        REFERENCES notifications(id),
    CONSTRAINT unique_notification_attempt
        UNIQUE (notification_id, attempt_number)
);

CREATE TABLE api_clients(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    api_hash_key VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outbox_events(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notification_id BIGINT NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    payload JSONB NOT NULL,
    published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,

    CONSTRAINT fk_outbox_notification 
    FOREIGN KEY(notification_id)
    REFERENCES notifications(id)
);