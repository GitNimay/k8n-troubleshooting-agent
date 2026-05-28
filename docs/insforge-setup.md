# InsForge Setup

Create the history table, progress table, and realtime channel before using the dashboard.

## Investigation History Table

Run this SQL in InsForge:

```sql
CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'unknown',
  confidence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  diagnosis JSONB NOT NULL DEFAULT '{}'::jsonb,
  investigation JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS investigations_user_created_idx
ON investigations (user_id, created_at DESC);
```

If you enable row-level security, add policies that let authenticated users read and insert only their own rows.

## Realtime Channel

Create this channel pattern in the InsForge Realtime dashboard:

```text
investigation:%
```

The frontend subscribes to `investigation:<generated-id>`. The FastAPI backend inserts progress rows into `investigation_progress`; the database trigger publishes realtime `progress` events to that channel.

## Investigation Progress Table

Run this SQL in InsForge:

```sql
CREATE TABLE IF NOT EXISTS investigation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  step TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS investigation_progress_investigation_created_idx
ON investigation_progress (investigation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS investigation_progress_user_created_idx
ON investigation_progress (user_id, created_at DESC);
```

If you enable row-level security, add policies that let authenticated users read and insert only their own progress rows.

## Progress Realtime Trigger

Run this SQL in InsForge:

```sql
CREATE OR REPLACE FUNCTION notify_investigation_progress()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'investigation:' || NEW.investigation_id,
    'progress',
    jsonb_build_object(
      'investigationId', NEW.investigation_id,
      'step', NEW.step,
      'label', NEW.label,
      'status', NEW.status,
      'timestamp', NEW.created_at,
      'metadata', NEW.metadata
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS investigation_progress_realtime ON investigation_progress;
CREATE TRIGGER investigation_progress_realtime
  AFTER INSERT ON investigation_progress
  FOR EACH ROW
  EXECUTE FUNCTION notify_investigation_progress();
```

## Environment Variables

Backend:

```env
INSFORGE_BASE_URL=https://your-project.region.insforge.app
```

Frontend:

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=https://your-project.region.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
```
