import logging
import sys

from loguru import logger


class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        logger.opt(depth=6, exception=record.exc_info).log(record.levelname, record.getMessage())


def configure_logging() -> None:
    logging.basicConfig(handlers=[InterceptHandler()], level=logging.INFO, force=True)
    logger.remove()
    logger.add(sys.stdout, level="INFO")

