let allErrors = [];


const logInput =
    document.getElementById("logInput");

const fileInput =
    document.getElementById("fileInput");

const fileName =
    document.getElementById("fileName");

const analyzeButton =
    document.getElementById("analyzeButton");

const loading =
    document.getElementById("loading");

const results =
    document.getElementById("results");

const errorList =
    document.getElementById("errorList");

const overviewBody =
    document.getElementById("overviewBody");

const searchInput =
    document.getElementById("searchInput");

const severityFilter =
    document.getElementById(
        "severityFilter"
    );


fileInput.addEventListener(
    "change",
    async function () {

        const file =
            fileInput.files[0];

        if (!file) {
            return;
        }

        fileName.textContent =
            file.name;

        const text =
            await file.text();

        logInput.value =
            text;
    }
);


analyzeButton.addEventListener(
    "click",
    analyzeLog
);


searchInput.addEventListener(
    "input",
    renderErrors
);


severityFilter.addEventListener(
    "change",
    renderErrors
);


async function analyzeLog() {

    const text =
        logInput.value.trim();

    if (!text) {

        alert(
            "Please upload or paste a log."
        );

        return;
    }

    loading.classList.remove(
        "hidden"
    );

    results.classList.add(
        "hidden"
    );

    analyzeButton.disabled =
        true;

    try {

        const response =
            await fetch(
                "/api/analyze",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        text: text,
                        source_name:
                            fileInput.files[0]
                                ? fileInput.files[0].name
                                : "Pasted Log"
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Analysis failed."
            );
        }

        allErrors =
            data.errors || [];

        document.getElementById(
            "environment"
        ).textContent =
            (
                data.environment || []
            ).join(" · ");

        document.getElementById(
            "totalLines"
        ).textContent =
            data.stats.total_lines;

        document.getElementById(
            "totalErrors"
        ).textContent =
            data.stats.total_errors;

        document.getElementById(
            "criticalErrors"
        ).textContent =
            data.stats.critical;

        document.getElementById(
            "uniqueErrors"
        ).textContent =
            data.stats.unique_errors;

        results.classList.remove(
            "hidden"
        );

        renderErrors();

        await loadKnowledge();

        window.scrollTo({
            top: results.offsetTop - 20,
            behavior: "smooth"
        });

    } catch (error) {

        alert(
            error.message
        );

    } finally {

        loading.classList.add(
            "hidden"
        );

        analyzeButton.disabled =
            false;
    }
}


function renderErrors() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const severity =
        severityFilter.value;

    const filtered =
        allErrors.filter(
            error => {

                if (
                    severity !== "ALL"
                    &&
                    error.severity !== severity
                ) {
                    return false;
                }

                if (!search) {
                    return true;
                }

                const text = [
                    error.type,
                    error.message,
                    error.file,
                    error.severity
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(
                    search
                );
            }
        );

    errorList.innerHTML = "";

    overviewBody.innerHTML = "";

    filtered.forEach(
        error => {

            renderErrorCard(
                error
            );

            renderOverviewRow(
                error
            );
        }
    );
}


function renderErrorCard(error) {

    const explanation =
        error.explanation || {};

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "error-card";

    const severityClass =
        error.severity === "Critical"
            ? "badge-critical"
            : error.severity === "Warning"
                ? "badge-warning"
                : "badge-error";

    let sourcesHtml = "";

    if (
        explanation.source ===
            "AI Research"
        &&
        explanation.confidence >= 0.70
        &&
        explanation.source_links
        &&
        explanation.source_links.length
    ) {

        sourcesHtml =
            `
            <h4>RELATED RESOURCES</h4>
            <div class="source-list">
                ${
                    explanation.source_links
                        .map(
                            source => `
                            <div>
                                <a
                                    href="${escapeHtml(source.url)}"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    ${escapeHtml(source.title)}
                                </a>
                            </div>
                            `
                        )
                        .join("")
                }
            </div>
            `;
    }

    let codeHtml = "";

    if (explanation.code) {

        codeHtml =
            `
            <h4>SUGGESTED CHANGE</h4>
            <pre>${escapeHtml(
                explanation.code
            )}</pre>
            `;
    }

    card.innerHTML = `
        <div class="error-heading">

            <div>

                <div class="error-type">
                    ◆ ${escapeHtml(
                        error.type
                    )}
                </div>

                <div class="badges">

                    <span class="badge ${severityClass}">
                        ${escapeHtml(
                            error.severity.toUpperCase()
                        )}
                    </span>

                    <span class="badge">
                        ${escapeHtml(
                            explanation.category ||
                            "General"
                        )}
                    </span>

                    <span class="badge">
                        ${escapeHtml(
                            explanation.component ||
                            "General"
                        )}
                    </span>

                </div>

            </div>

        </div>

        <div class="error-meta">

            LOCATION:
            ${escapeHtml(
                error.file || "Unknown"
            )}:${escapeHtml(
                String(
                    error.line || "-"
                )
            )}

            <br><br>

            OCCURRENCES:
            ${escapeHtml(
                String(
                    error.occurrences || 1
                )
            )}

            <br><br>

            KNOWLEDGE SOURCE:
            ${escapeHtml(
                explanation.source ||
                "Unknown"
            )}
            · Confidence
            ${Math.round(
                (
                    explanation.confidence ||
                    0
                ) * 100
            )}%

        </div>

        <div class="diagnosis">

            <h4>⌁ WHAT HAPPENED</h4>

            <p>
                ${escapeHtml(
                    explanation.description ||
                    "No explanation available."
                )}
            </p>

            <h4>⌁ LIKELY CAUSE</h4>

            <p>
                ${escapeHtml(
                    explanation.cause ||
                    "No sufficiently reliable cause was identified."
                )}
            </p>

            <h4>▣ FIX</h4>

            <p>
                ${escapeHtml(
                    explanation.fix ||
                    "Review the stack trace and affected component."
                )}
            </p>

            ${codeHtml}

            ${sourcesHtml}

            <details class="raw-log">

                <summary>
                    View raw log
                </summary>

                <pre>${escapeHtml(
                    error.raw || ""
                )}</pre>

            </details>

        </div>
    `;

    errorList.appendChild(
        card
    );
}


function renderOverviewRow(error) {

    const row =
        document.createElement(
            "tr"
        );

    row.innerHTML = `
        <td>
            ${escapeHtml(
                String(error.id)
            )}
        </td>

        <td>
            ${escapeHtml(
                error.type
            )}
        </td>

        <td>
            ${escapeHtml(
                error.severity
            )}
        </td>

        <td>
            ${escapeHtml(
                error.message
            )}
        </td>

        <td>
            ${escapeHtml(
                error.file || "-"
            )}
        </td>

        <td>
            ${escapeHtml(
                String(
                    error.line || "-"
                )
            )}
        </td>

        <td>
            ${escapeHtml(
                String(
                    error.occurrences || 1
                )
            )}
        </td>
    `;

    overviewBody.appendChild(
        row
    );
}


async function loadKnowledge() {

    try {

        const response =
            await fetch(
                "/api/knowledge"
            );

        const data =
            await response.json();

        document.getElementById(
            "kbTotal"
        ).textContent =
            data.total || 0;

        document.getElementById(
            "kbBuiltin"
        ).textContent =
            data.built_in || 0;

        document.getElementById(
            "kbLearned"
        ).textContent =
            data.learned || 0;

        document.getElementById(
            "kbConfidence"
        ).textContent =
            Math.round(
                (
                    data.average_confidence ||
                    0
                ) * 100
            ) + "%";

    } catch (error) {

        console.error(
            error
        );
    }
}


document.getElementById(
    "historyButton"
).addEventListener(
    "click",
    loadHistory
);


async function loadHistory() {

    const container =
        document.getElementById(
            "historyTable"
        );

    container.innerHTML =
        "Loading...";

    try {

        const response =
            await fetch(
                "/api/history"
            );

        const data =
            await response.json();

        if (
            !data.history ||
            !data.history.length
        ) {

            container.innerHTML =
                "<p class='muted'>No previous analyses.</p>";

            return;
        }

        container.innerHTML = `
            <div style="overflow-x:auto">

                <table>

                    <thead>

                        <tr>
                            <th>ID</th>
                            <th>Source</th>
                            <th>Lines</th>
                            <th>Errors</th>
                            <th>Critical</th>
                            <th>Warnings</th>
                            <th>Unique</th>
                            <th>Created</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            data.history
                                .map(
                                    item => `
                                    <tr>

                                        <td>
                                            ${escapeHtml(
                                                String(item.id)
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                item.source_name
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                String(item.total_lines)
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                String(item.total_errors)
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                String(item.critical)
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                String(item.warnings)
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                String(item.unique_errors)
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                item.created_at
                                            )}
                                        </td>

                                    </tr>
                                    `
                                )
                                .join("")
                        }

                    </tbody>

                </table>

            </div>
        `;

    } catch (error) {

        container.innerHTML =
            `<p>${escapeHtml(
                error.message
            )}</p>`;
    }
}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


loadHistory();
loadKnowledge();