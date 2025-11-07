import os
import time
import json
import psycopg2
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# ---- Database connection (matches your docker-compose service 'db') ----
PG_DSN = "dbname=postgres user=postgres password=postgres host=db port=5432"

analyzer = SentimentIntensityAnalyzer()

# ---- Connect helper ----
def get_conn():
    return psycopg2.connect(PG_DSN)

# ---- Simple sentiment classifier ----
def classify(text: str):
    vs = analyzer.polarity_scores(text or "")
    score = vs["compound"]
    label = (
        "positive" if score >= 0.05
        else "negative" if score <= -0.05
        else "neutral"
    )
    return {"score": score, "label": label, "model": "vader-0.1"}

# ---- Worker loop ----
def run_once():
    with get_conn() as conn, conn.cursor() as cur:
        # Log which DB/schema we are in
        cur.execute("SELECT current_database(), current_schema()")
        print("Connected to:", cur.fetchone(), flush=True)

        # Count pending rows
        cur.execute("SELECT COUNT(*) FROM feedback WHERE sentiment IS NULL")
        pending = cur.fetchone()[0]
        print(f"Pending rows: {pending}", flush=True)

        # Fetch feedback rows with no sentiment
        cur.execute("""
                    SELECT id, message
                    FROM feedback
                    WHERE sentiment IS NULL
                    ORDER BY created_at
                        LIMIT 50
            FOR UPDATE SKIP LOCKED
                    """)
        rows = cur.fetchall()

        if not rows:
            print("No pending rows; sleeping…", flush=True)
            return 0

        print(f"Processing {len(rows)} rows…", flush=True)
        for fid, message in rows:
            s = classify(message)
            cur.execute("""
                        UPDATE feedback
                        SET sentiment = %s::jsonb,
                    sentiment_version = %s,
                            sentiment_updated_at = now()
                        WHERE id = %s
                        """, (json.dumps(s), s["model"], fid))

        print("Updated sentiments.", flush=True)
        return len(rows)

# ---- Run forever ----
if __name__ == "__main__":
    while True:
        n = run_once()
        # If it processed something, check again soon; otherwise sleep longer
        time.sleep(1 if n else 5)
