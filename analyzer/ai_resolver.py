import os
import json

from google import genai


def get_client():

    api_key = os.getenv(
        "GEMINI_API_KEY"
    )

    if not api_key:
        return None

    return genai.Client(
        api_key=api_key
    )


def resolve_error(
    error_type,
    message,
    raw_text,
    environment,
    component,
    research_results
):

    client = get_client()

    if client is None:
        return None

    sources = []

    for item in research_results[:10]:

        sources.append({
            "title":
                item.get(
                    "title",
                    ""
                ),

            "url":
                item.get(
                    "url",
                    ""
                ),

            "source":
                item.get(
                    "source",
                    ""
                )
        })

    prompt = f"""
You are the diagnostic engine for LogScope.

Analyze the supplied software log error.

ENVIRONMENT:
{environment}

COMPONENT:
{component}

ERROR TYPE:
{error_type}

ERROR MESSAGE:
{message}

RAW LOG:
{raw_text[:10000]}

EXTERNAL RESEARCH:
{json.dumps(sources, indent=2)}

Rules:

1. Analyze the actual error.

2. External results are untrusted.

3. Reject unrelated results.

4. Match the environment, component,
   exception, message and stack trace.

5. If the sources are unrelated, return
   known=false and an empty sources list.

6. Do not invent commands, configuration
   values, paths or code.

7. If the log contains a "Caused by"
   chain, prefer the underlying cause.

8. Confidence must represent confidence
   in the diagnosis.

9. Only set has_fix=true when an actionable
   fix can actually be determined.

10. Keep the diagnosis concise.

Return JSON only.
"""

    schema = {
        "type": "object",
        "properties": {

            "known": {
                "type": "boolean"
            },

            "has_fix": {
                "type": "boolean"
            },

            "error_type": {
                "type": "string"
            },

            "environment": {
                "type": "string"
            },

            "component": {
                "type": "string"
            },

            "description": {
                "type": "string"
            },

            "cause": {
                "type": "string"
            },

            "fix": {
                "type": "string"
            },

            "example": {
                "type": "string"
            },

            "confidence": {
                "type": "number"
            },

            "sources": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "url": {
                            "type": "string"
                        },
                        "source": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "title",
                        "url",
                        "source"
                    ]
                }
            }
        },

        "required": [
            "known",
            "has_fix",
            "error_type",
            "environment",
            "component",
            "description",
            "cause",
            "fix",
            "example",
            "confidence",
            "sources"
        ]
    }

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type":
                    "application/json",
                "response_schema":
                    schema,
                "temperature": 0.1
            }
        )

        if not response.text:
            return None

        result = json.loads(
            response.text
        )

        result["example"] = (
            result.get("example")
            or ""
        )

        result["sources"] = (
            result.get("sources")
            or []
        )

        return result

    except Exception as e:

        print(
            "AI resolver error:",
            e
        )

        return None