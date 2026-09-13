import logging
import sys
import unittest
from pathlib import Path

# Ensure project root is in sys.path when run directly as a script
project_root = str(Path(__file__).resolve().parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.database import engine  # noqa: E402

# Turn off verbose SQL echo during test runs
engine.echo = False
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def run_all() -> bool:
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir="tests", pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)
