import os
import json

from flask import (
    Flask,
    render_template,
    request,
    jsonify
)

from logparser.log_parser import parse_log

from analyzer.analyzer import (
    group_errors,
    get_statistics
)

from analyzer.explanations import (
    get_explanation
)

from analyzer.knowledge import (
    initialize_knowledge
)

from analyzer.lookup import (
    lookup_error
)

from analyzer.ai_resolver import (
    resolve_error
)

from analyzer.environment_detector import (
    detect_environment,
    detect_primary_environment,
    detect_component
)

from database.db import (
    init_db,
    save_analysis,
    get_history,
    add_knowledge,
    get_knowledge_stats
)


app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)


_initialized = False


def ensure_database():

    global _initialized

    if _initialized:
        return

    init_db()
    initialize_knowledge()

    _initialized = True


@app.route("/")
def index():

    ensure_database()

    return render_template(
        "index.html"
    )


@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    try:

        ensure_database()

        return jsonify({
            "status": "ok",
            "database": "connected"
        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "database": "unavailable",
            "message": str(e)
        }), 500


@app.route(
    "/api/analyze",
    methods=["POST"]
)
def analyze():

    ensure_database()

    try:

        data = request.get_json(
            silent=True
        ) or {}

        text = data.get(
            "text",
            ""
        )

        source_name = data.get(
            "source_name",
            "Pasted Log"
        )

        if not text.strip():

            return jsonify({
                "error":
                    "Please provide a log."
            }), 400

        parsed = parse_log(
            text
        )

        errors = group_errors(
            parsed
        )

        environments = detect_environment(
            text
        )

        primary_environment = (
            detect_primary_environment(
                text
            )
        )

        for error in errors:

            raw = error.get(
                "raw",
                ""
            )

            component = detect_component(
                raw,
                primary_environment
            )

            explanation = get_explanation(
                error_type=error["type"],
                raw_text=raw,
                environment=environments
            )

            if explanation:

                error["explanation"] = (
                    explanation
                )

                continue

            research = lookup_error(
                error_type=error["type"],
                message=error["message"],
                environment=primary_environment,
                raw_text=raw,
                component=component
            )

            research_results = research.get(
                "results",
                []
            )

            ai_result = resolve_error(
                error_type=error["type"],
                message=error["message"],
                raw_text=raw,
                environment=primary_environment,
                component=component,
                research_results=research_results
            )

            if (
                ai_result
                and ai_result.get(
                    "has_fix",
                    False
                )
                and float(
                    ai_result.get(
                        "confidence",
                        0
                    )
                ) >= 0.70
            ):

                links = []

                for source in ai_result.get(
                    "sources",
                    []
                ):

                    if source.get(
                        "url"
                    ):
                        links.append(
                            source
                        )

                explanation = {

                    "category":
                        ai_result.get(
                            "environment",
                            primary_environment
                        ),

                    "component":
                        ai_result.get(
                            "component",
                            component
                        ),

                    "description":
                        ai_result.get(
                            "description",
                            ""
                        ),

                    "cause":
                        ai_result.get(
                            "cause",
                            ""
                        ),

                    "fix":
                        ai_result.get(
                            "fix",
                            ""
                        ),

                    "code":
                        ai_result.get(
                            "example",
                            ""
                        ),

                    "source":
                        "AI Research",

                    "confidence":
                        float(
                            ai_result.get(
                                "confidence",
                                0
                            )
                        ),

                    "times_seen": 0,

                    "source_links": links
                }

                error["explanation"] = (
                    explanation
                )

                pattern = (
                    error.get(
                        "message"
                    )
                    or error.get(
                        "type"
                    )
                )

                add_knowledge(
                    error_type=error["type"],
                    environment=ai_result.get(
                        "environment",
                        primary_environment
                    ),
                    component=ai_result.get(
                        "component",
                        component
                    ),
                    pattern=pattern[:250],
                    description=ai_result.get(
                        "description",
                        ""
                    ),
                    cause=ai_result.get(
                        "cause",
                        ""
                    ),
                    fix=ai_result.get(
                        "fix",
                        ""
                    ),
                    example=ai_result.get(
                        "example",
                        ""
                    ),
                    source="ai-researched",
                    confidence=float(
                        ai_result.get(
                            "confidence",
                            0
                        )
                    ),
                    source_links=links
                )

            else:

                error["explanation"] = {

                    "category":
                        primary_environment,

                    "component":
                        component,

                    "description":
                        "LogScope could not determine a reliable explanation.",

                    "cause":
                        "No sufficiently relevant diagnosis was generated.",

                    "fix":
                        "Review the stack trace and related technical resources.",

                    "code": "",

                    "source":
                        "No reliable diagnosis",

                    "confidence": 0,

                    "times_seen": 0,

                    "source_links": []
                }

        stats = get_statistics(
            errors,
            len(
                text.splitlines()
            )
        )

        save_analysis(
            source_name,
            stats,
            errors
        )

        return jsonify({
            "success": True,
            "source_name": source_name,
            "environment": environments,
            "primary_environment":
                primary_environment,
            "stats": stats,
            "errors": errors
        })

    except Exception as e:

        app.logger.exception(
            "Analysis failed"
        )

        return jsonify({
            "error":
                f"Analysis failed: {str(e)}"
        }), 500


@app.route(
    "/api/history",
    methods=["GET"]
)
def history():

    ensure_database()

    try:

        rows = get_history()

        result = []

        for row in rows:

            result.append({
                "id": row.get(
                    "id"
                ),

                "source_name":
                    row.get(
                        "source_name"
                    ),

                "total_lines":
                    row.get(
                        "total_lines"
                    ),

                "total_errors":
                    row.get(
                        "total_errors"
                    ),

                "critical":
                    row.get(
                        "critical"
                    ),

                "warnings":
                    row.get(
                        "warnings"
                    ),

                "unique_errors":
                    row.get(
                        "unique_errors"
                    ),

                "created_at":
                    str(
                        row.get(
                            "created_at"
                        )
                    )
            })

        return jsonify({
            "history": result
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


@app.route(
    "/api/knowledge",
    methods=["GET"]
)
def knowledge():

    ensure_database()

    try:

        return jsonify(
            get_knowledge_stats()
        )

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":

    port = int(
        os.getenv(
            "PORT",
            "5000"
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )