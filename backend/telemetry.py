"""
LangSmith Telemetry and Tracing Module for Project SENTIASA.
Configures tracing environment, payload scrubbing, privacy masking,
and failure-isolated execution tracing for Cloud Run and evaluation pipelines.
"""

import hashlib
import os
import re
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union
from dotenv import load_dotenv

# Load environment variables
_backend_dir = Path(__file__).resolve().parent
_root_dir = _backend_dir.parent

load_dotenv(dotenv_path=_backend_dir / ".env")
load_dotenv(dotenv_path=_root_dir / ".env")
load_dotenv()


def configure_langsmith_environment() -> None:
    """
    Configures LangSmith tracing environment variables if not already set.
    Synchronizes LANGSMITH_API_KEY and LANGCHAIN_API_KEY.
    """
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    project = (
        os.getenv("LANGSMITH_PROJECT")
        or os.getenv("LANGCHAIN_PROJECT")
        or "sentiasa-production-evals"
    )
    os.environ.setdefault("LANGCHAIN_PROJECT", project)
    os.environ.setdefault("LANGSMITH_PROJECT", project)
    endpoint = os.getenv("LANGCHAIN_ENDPOINT") or os.getenv("LANGSMITH_ENDPOINT") or "https://apac.api.smith.langchain.com"
    os.environ.setdefault("LANGCHAIN_ENDPOINT", endpoint)
    os.environ.setdefault("LANGSMITH_ENDPOINT", endpoint)

    api_key = os.getenv("LANGSMITH_API_KEY") or os.getenv("LANGCHAIN_API_KEY")
    if api_key:
        os.environ.setdefault("LANGSMITH_API_KEY", api_key)
        os.environ.setdefault("LANGCHAIN_API_KEY", api_key)


configure_langsmith_environment()


def get_tracer_metadata(extra_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Returns standard telemetry metadata tags for LangSmith trace runs.
    """
    meta: Dict[str, Any] = {
        "environment": os.getenv("SENTIASA_ENV", "cloud-run-preflight"),
        "policy_version_id": os.getenv("POLICY_VERSION_ID", "2026.09.v1"),
        "service": "sentiasa-triage",
    }
    if extra_metadata:
        for k, v in extra_metadata.items():
            if v is not None:
                meta[k] = v
    return meta


SENSITIVE_KEY_PATTERNS = {
    "api_key",
    "apikey",
    "authorization",
    "auth_token",
    "salted_ip_hash",
    "ip_hash",
    "secret",
    "password",
    "bearer",
    "token",
    "private_key",
}

# Regex to detect API keys or bearer tokens embedded in text strings
_KEY_INLINE_PATTERNS = [
    (re.compile(r"lsv2_pt_[a-zA-Z0-9_]+"), "[REDACTED_LANGSMITH_KEY]"),
    (re.compile(r"AIzaSy[a-zA-Z0-9_\-]{33}"), "[REDACTED_GOOGLE_API_KEY]"),
    (re.compile(r"(?i)\bBearer\s+[A-Za-z0-9_\-\.]+"), "Bearer [REDACTED]"),
]


def scrub_trace_payload(data: Any, max_string_len: int = 1500) -> Any:
    """
    Recursively masks sensitive tokens (e.g. api_key, authorization, salted_ip_hash),
    truncates long binary data or base64 strings (replaces with sha256:<hash> and byte size),
    and prevents payload explosion into LangSmith traces.
    """
    if data is None:
        return None

    # Handle Pydantic models (v1 and v2)
    if hasattr(data, "model_dump") and callable(data.model_dump):
        return scrub_trace_payload(data.model_dump(mode="json"), max_string_len=max_string_len)
    elif hasattr(data, "dict") and callable(data.dict):
        return scrub_trace_payload(data.dict(), max_string_len=max_string_len)

    # Handle byte data
    if isinstance(data, (bytes, bytearray)):
        digest = hashlib.sha256(data).hexdigest()
        return f"sha256:{digest} ({len(data)} bytes)"

    # Handle Datetime / Date
    if isinstance(data, (datetime, date)):
        return data.isoformat()

    # Handle Enum
    if hasattr(data, "value") and isinstance(data.value, (str, int, float, bool)):
        return data.value

    # Handle primitive booleans, numbers
    if isinstance(data, (int, float, bool)):
        return data

    # Handle strings
    if isinstance(data, str):
        # 1. Check data URI base64
        if data.startswith("data:") and ";base64," in data:
            raw_bytes = data.encode("utf-8", errors="ignore")
            digest = hashlib.sha256(raw_bytes).hexdigest()
            header = data.split(";base64,")[0]
            return f"{header};base64,sha256:{digest} ({len(raw_bytes)} bytes)"

        # 2. Check standalone base64 or binary dump
        if len(data) > 256:
            # Check if looks like pure base64 (no spaces, valid base64 chars)
            if (" " not in data and "\n" not in data) and re.match(r"^[A-Za-z0-9+/=]+$", data):
                raw_bytes = data.encode("utf-8", errors="ignore")
                digest = hashlib.sha256(raw_bytes).hexdigest()
                return f"sha256:{digest} ({len(raw_bytes)} bytes)"

        # 3. Inline key redaction
        scrubbed = data
        for pattern, replacement in _KEY_INLINE_PATTERNS:
            scrubbed = pattern.sub(replacement, scrubbed)

        # 4. Truncate extreme length strings
        if len(scrubbed) > max_string_len:
            digest = hashlib.sha256(scrubbed.encode("utf-8", errors="ignore")).hexdigest()
            return f"{scrubbed[:200]}... [TRUNCATED len={len(scrubbed)} sha256:{digest[:12]}]"

        return scrubbed

    # Handle dictionaries
    if isinstance(data, dict):
        scrubbed_dict: Dict[str, Any] = {}
        for k, v in data.items():
            k_str = str(k)
            k_lower = k_str.lower()
            if any(sens in k_lower for sens in SENSITIVE_KEY_PATTERNS):
                scrubbed_dict[k_str] = "[REDACTED]"
            else:
                scrubbed_dict[k_str] = scrub_trace_payload(v, max_string_len=max_string_len)
        return scrubbed_dict

    # Handle lists, tuples, sets
    if isinstance(data, (list, tuple, set)):
        return [scrub_trace_payload(item, max_string_len=max_string_len) for item in data]

    # Fallback to string representation
    return str(data)


def traced_run_triage(
    raw_text: str = "",
    video_path: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Any:
    """
    Executes run_triage wrapped inside a LangSmith traced span/run tree.
    Guarantees:
    1. Input and output payloads are scrubbed of secrets and long binaries before tracing.
    2. Execution timing (in milliseconds) is recorded.
    3. LangSmith telemetry failure or auth denial (e.g. 403 on PAT) never interrupts triage pipeline.
    """
    from backend.graph import run_triage

    start_time = time.perf_counter()
    tracer_meta = get_tracer_metadata(metadata)
    raw_inputs = {
        "raw_text": raw_text,
        "video_path": video_path,
        "metadata": metadata or {},
    }
    sanitized_inputs = scrub_trace_payload(raw_inputs)

    run_tree = None
    has_tracing = os.getenv("LANGCHAIN_TRACING_V2", "").lower() in ("true", "1")
    has_api_key = bool(os.getenv("LANGSMITH_API_KEY") or os.getenv("LANGCHAIN_API_KEY"))

    if has_tracing and has_api_key:
        try:
            from langsmith.run_trees import RunTree

            project = os.getenv("LANGCHAIN_PROJECT", "sentiasa-production-evals")
            run_tree = RunTree(
                name="sentiasa-triage-pipeline",
                run_type="chain",
                inputs=sanitized_inputs,
                extra={"metadata": tracer_meta},
                project_name=project,
            )
            run_tree.post()
        except Exception:
            # LangSmith connection or auth errors must not crash execution
            run_tree = None

    try:
        result = run_triage(
            raw_text=raw_text,
            video_path=video_path,
            metadata=metadata,
        )
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        sanitized_outputs = scrub_trace_payload(result)

        if run_tree:
            try:
                run_tree.end(
                    outputs=sanitized_outputs,
                    extra={
                        "metadata": {
                            **tracer_meta,
                            "execution_timing_ms": duration_ms,
                            "requires_operator_approval": result.get("requires_operator_approval", False),
                            "jev_passed": result.get("jev_passed", False),
                            "severity_tier": result.get("severity_tier", 1),
                        }
                    },
                )
                run_tree.patch()
            except Exception:
                pass

        return result
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        if run_tree:
            try:
                run_tree.end(
                    error=str(exc),
                    extra={
                        "metadata": {
                            **tracer_meta,
                            "execution_timing_ms": duration_ms,
                        }
                    },
                )
                run_tree.patch()
            except Exception:
                pass
        raise
