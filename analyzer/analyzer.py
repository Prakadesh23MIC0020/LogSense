from collections import Counter
import re


def normalize_message(message):

    message = str(
        message or ""
    ).lower()

    message = re.sub(
        r"\d+",
        "<number>",
        message
    )

    message = re.sub(
        r"\s+",
        " ",
        message
    )

    return message.strip()


def group_errors(errors):

    groups = {}

    for error in errors:

        key = (
            error["type"],
            normalize_message(
                error["message"]
            )
        )

        if key not in groups:

            groups[key] = error.copy()

            groups[key]["occurrences"] = 1

        else:

            groups[key]["occurrences"] += 1

    result = list(
        groups.values()
    )

    for index, error in enumerate(
        result,
        start=1
    ):
        error["id"] = index

    return result


def get_statistics(
    errors,
    total_lines
):

    severity = Counter(
        error["severity"]
        for error in errors
    )

    types = Counter(
        error["type"]
        for error in errors
    )

    total_errors = sum(
        error["occurrences"]
        for error in errors
        if error["severity"]
        in ["Error", "Critical"]
    )

    return {
        "total_lines": total_lines,
        "total_errors": total_errors,
        "critical": sum(
            error["occurrences"]
            for error in errors
            if error["severity"]
            == "Critical"
        ),
        "warnings": sum(
            error["occurrences"]
            for error in errors
            if error["severity"]
            == "Warning"
        ),
        "unique_errors": len(errors),
        "types": types,
        "severity": severity
    }