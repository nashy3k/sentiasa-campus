"""
Global pytest configuration for Project SENTIASA.
Guarantees hermetic test execution with zero external network side-effects.
"""

import os
import sys

# Disable live network telemetry and remote stores during unit tests
os.environ["FIRESTORE_ENABLED"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["DISABLE_RATE_LIMITER"] = "true"
