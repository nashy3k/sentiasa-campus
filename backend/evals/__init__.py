"""
Evals module for Project SENTIASA.
Includes Synthetic Persona Generator, ILMU Shadow Judge Evaluator,
and Slang / Demographic Fairness Benchmark utilities.
"""

from .persona_generator import (
    StudentPersona,
    SyntheticStudentPersonaGenerator,
    get_default_cohort,
)
from .ilmu_evaluator import (
    ILMUShadowJudge,
    ILMUEvalVerdict,
    ILMUBenchmarkResult,
    DemographicFairnessReport,
    GenericGlobalBaselineModel,
)

__all__ = [
    "StudentPersona",
    "SyntheticStudentPersonaGenerator",
    "get_default_cohort",
    "ILMUShadowJudge",
    "ILMUEvalVerdict",
    "ILMUBenchmarkResult",
    "DemographicFairnessReport",
    "GenericGlobalBaselineModel",
]
