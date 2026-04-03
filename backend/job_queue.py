"""
Job Queue for Preview Generation

Provides:
- In-memory job store for preview generation jobs
- Semaphore-based concurrency control
- Job status tracking (queued -> processing -> completed/failed)
- Automatic cleanup of old jobs
"""

import asyncio
import uuid
import time
import logging
from typing import Dict, Any, Optional, Literal
from dataclasses import dataclass, field
from enum import Enum
import threading

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Job status values."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(str, Enum):
    """Types of preview generation jobs."""
    WALLPAPER_TEXTURE = "wallpaper_texture"  # Generate custom wallpaper texture
    ROOM_PREVIEW = "room_preview"  # Apply wallpaper to room (includes direct preview)


@dataclass
class PreviewJob:
    """Represents a preview generation job."""
    id: str
    type: JobType
    status: JobStatus
    retry_count: int = 0
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    input_payload: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None  # Safe user-facing error
    raw_error: Optional[str] = None  # Internal error for debugging

    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary for API response."""
        return {
            "id": self.id,
            "type": self.type.value,
            "status": self.status.value,
            "retry_count": self.retry_count,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "result": self.result if self.status == JobStatus.COMPLETED else None,
            "error_message": self.error_message if self.status in (JobStatus.FAILED, JobStatus.CANCELLED) else None,
        }


class ConcurrencyLimiter:
    """
    Semaphore-based concurrency limiter for different job types.

    Provides separate limits for:
    - Wallpaper texture generation: max 1 concurrent (Gemini 2.5 Flash)
    - Room preview generation: max 2 concurrent (Gemini 3.1 Flash)
    """

    def __init__(
        self,
        wallpaper_texture_limit: int = 1,
        room_preview_limit: int = 2
    ):
        self._wallpaper_semaphore = asyncio.Semaphore(wallpaper_texture_limit)
        self._room_semaphore = asyncio.Semaphore(room_preview_limit)
        self._lock = threading.Lock()

        # Track active jobs for monitoring
        self._active_wallpaper_jobs = 0
        self._active_room_jobs = 0

    async def acquire(self, job_type: JobType) -> asyncio.Semaphore:
        """Acquire a slot for the given job type."""
        if job_type == JobType.WALLPAPER_TEXTURE:
            with self._lock:
                self._active_wallpaper_jobs += 1
            logger.info(f"Acquiring wallpaper slot ({self._active_wallpaper_jobs}/1 active)")
            await self._wallpaper_semaphore.acquire()
            return self._wallpaper_semaphore
        else:  # ROOM_PREVIEW
            with self._lock:
                self._active_room_jobs += 1
            logger.info(f"Acquiring room preview slot ({self._active_room_jobs}/2 active)")
            await self._room_semaphore.acquire()
            return self._room_semaphore

    def release(self, job_type: JobType):
        """Release a slot for the given job type."""
        if job_type == JobType.WALLPAPER_TEXTURE:
            self._wallpaper_semaphore.release()
            with self._lock:
                self._active_wallpaper_jobs -= 1
            logger.info(f"Released wallpaper slot ({self._active_wallpaper_jobs}/1 active)")
        else:
            self._room_semaphore.release()
            with self._lock:
                self._active_room_jobs -= 1
            logger.info(f"Released room preview slot ({self._active_room_jobs}/2 active)")


class JobQueue:
    """
    In-memory job queue for preview generation.

    Features:
    - Job creation and tracking
    - Status updates
    - Automatic cleanup of old jobs
    - Thread-safe operations
    """

    # Job TTL: 30 minutes for completed/failed jobs
    JOB_TTL_SECONDS = 1800

    # Maximum jobs to keep in memory
    MAX_JOBS = 1000

    def __init__(self):
        self._jobs: Dict[str, PreviewJob] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        self._lock = threading.Lock()
        self._concurrency = ConcurrencyLimiter()

        # Start cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start_cleanup_task(self):
        """Start background task to clean up old jobs."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def _cleanup_loop(self):
        """Periodically remove old completed/failed jobs."""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                self._cleanup_old_jobs()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")

    def _cleanup_old_jobs(self):
        """Remove jobs older than TTL."""
        current_time = time.time()
        with self._lock:
            expired_ids = []
            for job_id, job in self._jobs.items():
                if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
                    if (current_time - job.updated_at) > self.JOB_TTL_SECONDS:
                        expired_ids.append(job_id)

            for job_id in expired_ids:
                del self._jobs[job_id]
                self._tasks.pop(job_id, None)

            if expired_ids:
                logger.info(f"Cleaned up {len(expired_ids)} old jobs")

            # Enforce max jobs limit
            if len(self._jobs) > self.MAX_JOBS:
                # Remove oldest completed/failed jobs
                sorted_jobs = sorted(
                    self._jobs.values(),
                    key=lambda j: (j.status != JobStatus.PROCESSING, j.created_at)
                )
                to_remove = len(self._jobs) - self.MAX_JOBS
                for job in sorted_jobs[:to_remove]:
                    if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
                        del self._jobs[job.id]
                        self._tasks.pop(job.id, None)

    def create_job(
        self,
        job_type: JobType,
        input_payload: Dict[str, Any]
    ) -> PreviewJob:
        """Create a new job in queued status."""
        job_id = str(uuid.uuid4())
        job = PreviewJob(
            id=job_id,
            type=job_type,
            status=JobStatus.QUEUED,
            input_payload=input_payload
        )

        with self._lock:
            self._jobs[job_id] = job

        logger.info(f"Created job {job_id} type={job_type.value}")
        return job

    def get_job(self, job_id: str) -> Optional[PreviewJob]:
        """Get job by ID."""
        with self._lock:
            return self._jobs.get(job_id)

    def register_task(self, job_id: str, task: asyncio.Task):
        """Register the asyncio task processing a given job."""
        with self._lock:
            self._tasks[job_id] = task

    def clear_task(self, job_id: str):
        """Remove the tracked task for a given job."""
        with self._lock:
            self._tasks.pop(job_id, None)

    def cancel_job(self, job_id: str) -> Optional[PreviewJob]:
        """Cancel an in-flight or queued job."""
        task_to_cancel: Optional[asyncio.Task] = None

        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
                return job

            job.status = JobStatus.CANCELLED
            job.updated_at = time.time()
            job.error_message = "Generation cancelled."
            job.raw_error = "Cancelled by client"
            task_to_cancel = self._tasks.get(job_id)

        if task_to_cancel and not task_to_cancel.done():
            task_to_cancel.cancel()

        logger.info(f"Cancelled job {job_id}")
        return self.get_job(job_id)

    def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        raw_error: Optional[str] = None
    ) -> Optional[PreviewJob]:
        """Update job status and optionally set result/error."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            job.status = status
            job.updated_at = time.time()

            if result:
                job.result = result
            if error_message:
                job.error_message = error_message
            if raw_error:
                job.raw_error = raw_error

            logger.info(f"Updated job {job_id} status={status.value}")
            return job

    def increment_retry(self, job_id: str) -> Optional[int]:
        """Increment retry count for a job."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            job.retry_count += 1
            job.updated_at = time.time()
            return job.retry_count

    def get_concurrency_limiter(self) -> ConcurrencyLimiter:
        """Get the concurrency limiter for this queue."""
        return self._concurrency


# Global job queue instance
job_queue = JobQueue()


async def get_job_queue() -> JobQueue:
    """Get the global job queue instance, starting cleanup if needed."""
    await job_queue.start_cleanup_task()
    return job_queue
