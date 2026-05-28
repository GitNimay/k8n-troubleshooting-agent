from app.ai.root_cause_analyzer import analyze_root_cause


def reason_about_cluster(investigation: dict) -> dict:
    return analyze_root_cause(investigation)
