"""
Retry Wrapper with Exponential Backoff

Provides retry logic for Gemini API calls with:
- Exponential backoff with jitter
- Transient error detection (503, 429, 5xx)
- Configurable max retries
- Logging of retry attempts
"""

import asyncio
import random
import logging
from typing import Callable, Any, Optional, TypeVar, Awaitable
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')

# Retry configuration
MAX_RETRIES = 3
BASE_DELAY = 2.0  # Base delay in seconds
MAX_DELAY = 10.0  # Maximum delay cap
JITTER_FACTOR = 0.5  # Add up to 50% random jitter


def is_transient_error(error: Exception) -> bool:
    """
    Check if an error is transient and worth retrying.

    Retries on:
    - HTTP 503 (Service Unavailable)
    - HTTP 429 (Too Many Requests)
    - HTTP 5xx server errors
    - Connection timeouts
    - Service unavailable messages

    Does NOT retry on:
    - HTTP 4xx client errors (invalid input, auth errors)
    - Validation errors
    """
    error_str = str(error).upper()

    # Check for transient HTTP status codes
    if "503" in error_str or "UNAVAILABLE" in error_str:
        return True
    if "429" in error_str or "TOO MANY REQUESTS" in error_str:
        return True

    # Check for 5xx server errors (but not 500 which might be permanent)
    if any(f"{code}" in error_str for code in ["502", "504", "529"]):
        return True

    # Check for transient connection issues
    transient_keywords = [
        "TIMEOUT", "CONNECTION ERROR", "NETWORK", "TEMPORARILY UNAVAILABLE",
        "HIGH DEMAND", "RATE LIMIT", "OVERLOADED"
    ]
    if any(keyword in error_str for keyword in transient_keywords):
        return True

    # Auth errors (401) and validation errors should NOT be retried
    if "401" in error_str or "AUTHENTICATION" in error_str:
        return False
    if "400" in error_str or "VALIDATION" in error_str:
        return False
    if "404" in error_str or "NOT FOUND" in error_str:
        return False

    return False


def calculate_backoff_delay(attempt: int, base_delay: float = BASE_DELAY) -> float:
    """
    Calculate delay with exponential backoff and jitter.

    Formula: min(base_delay * (2 ^ attempt) * random_jitter, MAX_DELAY)

    Delays approximately:
    - Attempt 1: 2-3 seconds
    - Attempt 2: 4-6 seconds
    - Attempt 3: 8-12 seconds (capped at MAX_DELAY)
    """
    # Exponential backoff
    delay = base_delay * (2 ** attempt)

    # Add jitter (±50% randomization)
    jitter = random.uniform(1 - JITTER_FACTOR, 1 + JITTER_FACTOR)
    delay *= jitter

    # Cap at maximum delay
    return min(delay, MAX_DELAY)


async def retry_async(
    func: Callable[..., Awaitable[T]],
    *args,
    max_retries: int = MAX_RETRIES,
    base_delay: float = BASE_DELAY,
    **kwargs
) -> T:
    """
    Retry an async function with exponential backoff.

    Args:
        func: Async function to retry
        *args: Positional arguments for the function
        max_retries: Maximum number of retry attempts (default: 3)
        base_delay: Base delay in seconds (default: 2.0)
        **kwargs: Keyword arguments for the function

    Returns:
        The result of the function if successful

    Raises:
        The last exception if all retries fail
    """
    last_exception: Optional[Exception] = None

    for attempt in range(max_retries + 1):  # +1 for initial attempt
        try:
            if attempt > 0:
                logger.info(f"Retry attempt {attempt}/{max_retries}")

            return await func(*args, **kwargs)

        except Exception as e:
            last_exception = e

            # Log the error
            if attempt == 0:
                logger.warning(f"Initial attempt failed: {type(e).__name__}: {str(e)[:200]}")
            else:
                logger.warning(f"Retry {attempt}/{max_retries} failed: {type(e).__name__}: {str(e)[:200]}")

            # Check if we should retry
            if attempt >= max_retries:
                logger.error(f"All {max_retries} retries exhausted")
                raise

            if not is_transient_error(e):
                logger.info(f"Non-transient error, not retrying: {type(e).__name__}")
                raise

            # Calculate and wait for backoff delay
            delay = calculate_backoff_delay(attempt, base_delay)
            logger.info(f"Waiting {delay:.2f}s before retry {attempt + 1}/{max_retries}")
            await asyncio.sleep(delay)

    # Should never reach here, but just in case
    if last_exception:
        raise last_exception
    raise RuntimeError("Unexpected retry loop exit")


def retry_sync(
    func: Callable[..., T],
    *args,
    max_retries: int = MAX_RETRIES,
    base_delay: float = BASE_DELAY,
    **kwargs
) -> T:
    """
    Retry a sync function with exponential backoff.

    Note: For async functions, use retry_async instead.

    Args:
        func: Sync function to retry
        *args: Positional arguments for the function
        max_retries: Maximum number of retry attempts (default: 3)
        base_delay: Base delay in seconds (default: 2.0)
        **kwargs: Keyword arguments for the function

    Returns:
        The result of the function if successful

    Raises:
        The last exception if all retries fail
    """
    last_exception: Optional[Exception] = None

    for attempt in range(max_retries + 1):  # +1 for initial attempt
        try:
            if attempt > 0:
                logger.info(f"Retry attempt {attempt}/{max_retries}")

            return func(*args, **kwargs)

        except Exception as e:
            last_exception = e

            # Log the error
            if attempt == 0:
                logger.warning(f"Initial attempt failed: {type(e).__name__}: {str(e)[:200]}")
            else:
                logger.warning(f"Retry {attempt}/{max_retries} failed: {type(e).__name__}: {str(e)[:200]}")

            # Check if we should retry
            if attempt >= max_retries:
                logger.error(f"All {max_retries} retries exhausted")
                raise

            if not is_transient_error(e):
                logger.info(f"Non-transient error, not retrying: {type(e).__name__}")
                raise

            # Calculate and wait for backoff delay
            delay = calculate_backoff_delay(attempt, base_delay)
            logger.info(f"Waiting {delay:.2f}s before retry {attempt + 1}/{max_retries}")
            import time
            time.sleep(delay)

    # Should never reach here, but just in case
    if last_exception:
        raise last_exception
    raise RuntimeError("Unexpected retry loop exit")


def with_retry(
    max_retries: int = MAX_RETRIES,
    base_delay: float = BASE_DELAY
):
    """
    Decorator to add retry logic to an async function.

    Usage:
        @with_retry(max_retries=3, base_delay=2.0)
        async def my_function():
            ...
    """
    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            return await retry_async(
                func, *args,
                max_retries=max_retries,
                base_delay=base_delay,
                **kwargs
            )
        return wrapper
    return decorator
