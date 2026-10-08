import re
import requests


STACK_API = (
    "https://api.stackexchange.com/2.3/search/advanced"
)

GITHUB_API = (
    "https://api.github.com/search/issues"
)


def clean_text(text):

    text = str(
        text or ""
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


def build_query(
    error_type,
    message,
    environment,
    component=None
):

    parts = []

    if environment:
        parts.append(
            environment
        )

    if component and component != "General":
        parts.append(
            component
        )

    if (
        error_type
        and error_type != "Unknown Error"
    ):
        parts.append(
            error_type
        )

    if message:
        parts.append(
            clean_text(message)[:220]
        )

    return " ".join(parts)


def search_stackoverflow(query):

    try:

        response = requests.get(
            STACK_API,
            params={
                "order": "desc",
                "sort": "relevance",
                "q": query,
                "site": "stackoverflow",
                "pagesize": 5,
                "answers": 1
            },
            timeout=8
        )

        if response.status_code != 200:
            return []

        data = response.json()

        results = []

        for item in data.get(
            "items",
            []
        ):

            title = clean_text(
                re.sub(
                    r"<[^>]+>",
                    "",
                    item.get(
                        "title",
                        ""
                    )
                )
            )

            results.append({
                "title": title,
                "url": item.get(
                    "link",
                    ""
                ),
                "source":
                    "Stack Overflow",
                "score":
                    item.get(
                        "score",
                        0
                    ),
                "answers":
                    item.get(
                        "answer_count",
                        0
                    )
            })

        return results

    except Exception:
        return []


def search_github(query):

    try:

        response = requests.get(
            GITHUB_API,
            params={
                "q": query,
                "sort": "reactions",
                "order": "desc",
                "per_page": 5
            },
            headers={
                "Accept":
                    "application/vnd.github+json"
            },
            timeout=8
        )

        if response.status_code != 200:
            return []

        data = response.json()

        return [
            {
                "title": clean_text(
                    item.get(
                        "title",
                        ""
                    )
                ),
                "url": item.get(
                    "html_url",
                    ""
                ),
                "source": "GitHub",
                "score": item.get(
                    "score",
                    0
                ),
                "answers": 0
            }
            for item in data.get(
                "items",
                []
            )
        ]

    except Exception:
        return []


def lookup_error(
    error_type,
    message,
    environment="General",
    raw_text="",
    component=None
):

    query = build_query(
        error_type,
        message,
        environment,
        component
    )

    results = (
        search_stackoverflow(query)
        +
        search_github(query)
    )

    return {
        "query": query,
        "results": results
    }