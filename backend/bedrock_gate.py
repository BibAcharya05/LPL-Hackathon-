import fcntl
import os
import tempfile
import time
from pathlib import Path

LOCK_FILE = Path(
    os.getenv(
        "BEDROCK_RATE_LOCK",
        str(Path(tempfile.gettempdir()) /
            f"transition-copilot-bedrock-{os.getuid()}.lock"),
    )
)
INTERVAL = 1.1


def converse(client, **kwargs):
    # Keep the lock throughout the request, then wait at least
    # 1.1 seconds after it finishes before allowing another.
    with LOCK_FILE.open("a+", encoding="utf-8") as gate:
        fcntl.flock(gate.fileno(), fcntl.LOCK_EX)
        try:
            gate.seek(0)
            saved = gate.read().strip()
            previous = float(saved) if saved else 0.0
            delay = max(0.0, INTERVAL - (time.time() - previous))
            if delay:
                time.sleep(delay)

            try:
                return client.converse(**kwargs)
            finally:
                gate.seek(0)
                gate.truncate()
                gate.write(str(time.time()))
                gate.flush()
        finally:
            fcntl.flock(gate.fileno(), fcntl.LOCK_UN)
