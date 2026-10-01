from pydantic import BaseModel


class ValueComparison(BaseModel):
    test_name: str
    old_value: float | None
    new_value: float | None
    unit: str | None
    trend: str  # improved | worsened | unchanged | new


class CompareResponse(BaseModel):
    report_a_id: int
    report_b_id: int
    comparisons: list[ValueComparison]
    ai_trend_summary: str | None = None
