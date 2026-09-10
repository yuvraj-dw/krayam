import logging
import sys
import unittest

from app.database import engine

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
