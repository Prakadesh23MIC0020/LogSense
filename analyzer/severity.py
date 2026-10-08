def calculate_severity(
    text,
    detected_type=None
):

    s = text.lower()

    critical_words = [
        "fatal",
        "critical",
        "panic",
        "outofmemory",
        "kernel panic",
        "segmentation fault",
        "database corruption"
    ]

    warning_words = [
        "warning",
        "warn",
        "deprecated",
        "can't keep up",
        "running behind"
    ]

    for word in critical_words:

        if word in s:
            return "Critical"

    if detected_type in [
        "NullPointerException",
        "SQLException",
        "OutOfMemoryError",
        "Authentication Failure"
    ]:
        return "Critical"

    for word in warning_words:

        if word in s:
            return "Warning"

    return "Error"