ALTER TABLE feedbacks
    ADD COLUMN IF NOT EXISTS sentiment JSONB,
    ADD COLUMN IF NOT EXISTS sentiment_version TEXT,
    ADD COLUMN IF NOT EXISTS sentiment_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_feedbacks_sentiment_gin
    ON feedbacks USING GIN (sentiment);

CREATE INDEX IF NOT EXISTS idx_feedbacks_sentiment_label
    ON feedbacks ((sentiment->>'label'));
