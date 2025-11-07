CREATE TABLE IF NOT EXISTS feedbacks (
                                         id BIGSERIAL PRIMARY KEY,
                                         employee_id BIGINT,
                                         text TEXT NOT NULL,
                                         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks (created_at);
