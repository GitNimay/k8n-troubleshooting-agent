from pydantic import BaseModel, Field


class Diagnosis(BaseModel):
    root_cause: str | None = None
    explanation: str | None = None
    fix: str | None = None
    kubectl_commands: list[str] = Field(default_factory=list)
    prevention: str | None = None
    confidence: int = 0
    confidence_reasoning: list[str] = Field(default_factory=list)
