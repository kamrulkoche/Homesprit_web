"""Root test configuration.

Sets ``ENVIRONMENT=test`` BEFORE anything under `src/` is imported. The config
loader reads it at import time to pick `config/.env.test` and to skip the
developer's root `.env`, so the suite never sees a real DATABASE_URL — it
builds its own SQLite databases instead (see `tests/integration/conftest.py`).
"""

import os

os.environ["ENVIRONMENT"] = "test"
