let errors = [];

let stats = {};

let environments = [];

let severityChart = null;

let typeChart = null;


const $ = id =>
    document.getElementById(id);


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* TABS */

document.querySelectorAll(".tab").forEach(button => {

    button.addEventListener("click", () => {

        const name =
            button.dataset.tab;


        document
            .querySelectorAll(".tab")
            .forEach(x => {

                x.classList.toggle(
                    "active",
                    x.dataset.tab === name
                );

            });


        document
            .querySelectorAll(".tab-panel")
            .forEach(x => {

                x.classList.toggle(
                    "active",
                    x.id === name
                );

            });


        if (name === "history") {

            loadHistory();

            loadKnowledge();

        }

    });

});


/* FILE */

$("fileInput")
    .addEventListener(
        "change",
        async event => {

            const file =
                event.target.files[0];


            if (!file) {

                return;

            }


            $("fileName")
                .textContent =
                file.name;


            try {

                $("logInput").value =
                    await file.text();

            }

            catch {

                $("fileName")
                    .textContent =
                    "Could not read file";

            }

        }
    );


/* ANALYZE */

$("analyzeBtn")
    .addEventListener(
        "click",
        analyze
    );


async function analyze() {

    const text =
        $("logInput")
            .value
            .trim();


    if (!text) {

        $("analyzeStatus")
            .innerHTML =
            `
            <div class="status error">
                Please upload or paste a log.
            </div>
            `;

        return;

    }


    $("analyzeBtn").disabled =
        true;


    $("analyzeBtn")
        .textContent =
        "Analyzing...";


    $("analyzeStatus")
        .innerHTML =
        `
        <div class="status">
            Analyzing log...
        </div>
        `;


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

                    body:
                        JSON.stringify({

                            text: text,

                            source_name:
                                $("fileInput")
                                    .files[0]
                                    ?.name
                                ||
                                "Pasted Log"

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Analysis failed"
            );

        }


        errors =
            data.errors || [];


        stats =
            data.stats || {};


        environments =
            data.environments ||
            ["General"];


        renderResults();


        $("analyzeStatus")
            .innerHTML =
            `
            <div class="status">
                Analysis completed.
                Open the Results tab to view the diagnosis.
            </div>
            `;


        document
            .querySelector(
                '[data-tab="results"]'
            )
            .click();


        loadKnowledge();

    }

    catch (error) {

        $("analyzeStatus")
            .innerHTML =
            `
            <div class="status error">
                ${escapeHtml(error.message)}
            </div>
            `;

    }

    finally {

        $("analyzeBtn")
            .disabled =
            false;


        $("analyzeBtn")
            .textContent =
            "Analyze Log";

    }

}


/* RESULTS */

function renderResults() {

    $("emptyResults")
        .classList
        .add("hidden");


    $("resultsContent")
        .classList
        .remove("hidden");


    $("environmentCard")
        .innerHTML =
        `
        <div class="stat-title">
            DETECTED ENVIRONMENT
        </div>

        <div class="environment-title">
            ${escapeHtml(
                environments.join(" · ")
            )}
        </div>
        `;


    $("totalLines")
        .textContent =
        stats.total_lines || 0;


    $("totalErrors")
        .textContent =
        stats.total_errors || 0;


    $("criticalErrors")
        .textContent =
        stats.critical || 0;


    $("uniqueErrors")
        .textContent =
        stats.unique_errors || 0;


    renderErrors();

    renderCharts();

}


/* FILTER */

function getSelectedSeverities() {

    return Array
        .from(
            $("severityFilter")
                .selectedOptions
        )
        .map(x => x.value);

}


function getFilteredErrors() {

    const query =
        $("searchInput")
            .value
            .toLowerCase()
            .trim();


    const selected =
        getSelectedSeverities();


    return errors.filter(
        error => {

            if (
                !selected.includes(
                    error.severity
                )
            ) {

                return false;

            }


            if (!query) {

                return true;

            }


            const searchable =
                [

                    error.type,

                    error.message,

                    error.file

                ]
                    .join(" ")
                    .toLowerCase();


            return searchable
                .includes(query);

        }
    );

}


/* ERROR CARDS */

function renderErrors() {

    const filtered =
        getFilteredErrors();


    $("errorCards")
        .innerHTML =
        filtered
            .map(
                error =>
                    createErrorCard(error)
            )
            .join("");


    if (!filtered.length) {

        $("errorCards")
            .innerHTML =
            `
            <div class="info-box">
                No errors match the current filters.
            </div>
            `;

    }


    $("errorTable")
        .innerHTML =
        filtered
            .map(
                error =>
                    `
                    <tr>

                        <td>
                            ${escapeHtml(
                                error.type ||
                                "Unknown Error"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                error.severity ||
                                "Error"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                error.file ||
                                "Unknown"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                error.line ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                error.occurrences ||
                                1
                            )}
                        </td>

                    </tr>
                    `
            )
            .join("");

}


function createErrorCard(error) {

    const explanation =
        error.explanation ||
        {};


    const confidence =
        Number(
            explanation.confidence ||
            0
        );


    const source =
        explanation.source ||
        "Unknown";


    const category =
        explanation.category ||
        environments[0] ||
        "General";


    const component =
        explanation.component ||
        "General";


    const file =
        error.file ||
        "Unknown";


    const line =
        error.line ||
        "-";


    let resources = "";


    const links =
        explanation.source_links ||
        [];


    if (
        links.length &&
        source === "AI Research" &&
        confidence >= 0.70
    ) {

        resources =
            `
            <div class="section-title">
                ◈ Related resources
            </div>

            ${
                links
                    .map(
                        item =>
                            `
                            <div class="resource">

                                <a
                                    href="${escapeHtml(
                                        item.url ||
                                        "#"
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    ${escapeHtml(
                                        item.title ||
                                        "Source"
                                    )}
                                </a>

                            </div>
                            `
                    )
                    .join("")
            }
            `;

    }


    let code = "";


    if (explanation.code) {

        code =
            `
            <div class="section-title">
                ▣ Suggested change
            </div>

            <pre class="code-block">${escapeHtml(
                explanation.code
            )}</pre>
            `;

    }


    return `
        <article class="error-card">

            <div class="error-title">
                ◆ ${escapeHtml(
                    error.type ||
                    "Unknown Error"
                )}
            </div>


            <div class="badges">

                <span class="badge">
                    ${escapeHtml(
                        String(
                            error.severity ||
                            "Error"
                        ).toUpperCase()
                    )}
                </span>


                <span class="badge">
                    ${escapeHtml(category)}
                </span>


                <span class="badge">
                    ${escapeHtml(component)}
                </span>

            </div>


            <div class="error-meta">

                <div class="meta-label">
                    LOCATION
                </div>

                <div>
                    ${escapeHtml(file)}:${escapeHtml(line)}
                </div>


                <div class="meta-label">
                    OCCURRENCES
                </div>

                <div>
                    ${escapeHtml(
                        error.occurrences ||
                        1
                    )}
                </div>


                <div class="meta-label">
                    KNOWLEDGE SOURCE
                </div>

                <div>
                    ${escapeHtml(source)}
                    · Confidence
                    ${Math.round(
                        confidence * 100
                    )}%
                </div>

            </div>


            <div class="section-title">
                ⌁ What happened
            </div>

            <div>
                ${escapeHtml(
                    explanation.description ||
                    "No explanation available."
                )}
            </div>


            <div class="section-title">
                ⌁ Likely cause
            </div>

            <div>
                ${escapeHtml(
                    explanation.cause ||
                    "No sufficiently reliable cause was identified."
                )}
            </div>


            <div class="section-title">
                ▣ Fix
            </div>

            <div>
                ${escapeHtml(
                    explanation.fix ||
                    "Review the stack trace and investigate the affected component."
                )}
            </div>


            ${code}


            ${resources}


            <details>

                <summary>
                    View raw log
                </summary>

                <pre class="raw-log">${escapeHtml(
                    error.raw ||
                    ""
                )}</pre>

            </details>

        </article>
    `;

}


/* SEARCH */

$("searchInput")
    .addEventListener(
        "input",
        renderErrors
    );


$("severityFilter")
    .addEventListener(
        "change",
        renderErrors
    );


/* CHARTS */

function renderCharts() {

    const severity =
        stats.severity ||
        {};


    const types =
        stats.types ||
        {};


    if (severityChart) {

        severityChart.destroy();

    }


    if (typeChart) {

        typeChart.destroy();

    }


    severityChart =
        new Chart(
            $("severityChart"),
            {

                type: "bar",

                data: {

                    labels:
                        Object.keys(
                            severity
                        ),

                    datasets: [

                        {

                            label:
                                "Count",

                            data:
                                Object.values(
                                    severity
                                )

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        title: {

                            display: true,

                            text:
                                "Severity Distribution",

                            color:
                                "#ddd"

                        },

                        legend: {

                            display:
                                false

                        }

                    },

                    scales: {

                        x: {

                            ticks: {
                                color: "#aaa"
                            },

                            grid: {
                                color:
                                    "rgba(255,255,255,.05)"
                            }

                        },

                        y: {

                            ticks: {
                                color: "#aaa"
                            },

                            grid: {
                                color:
                                    "rgba(255,255,255,.05)"
                            }

                        }

                    }

                }

            }
        );


    typeChart =
        new Chart(
            $("typeChart"),
            {

                type: "bar",

                data: {

                    labels:
                        Object.keys(
                            types
                        ),

                    datasets: [

                        {

                            label:
                                "Count",

                            data:
                                Object.values(
                                    types
                                )

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        title: {

                            display: true,

                            text:
                                "Error Types",

                            color:
                                "#ddd"

                        },

                        legend: {

                            display:
                                false

                        }

                    },

                    scales: {

                        x: {

                            ticks: {
                                color: "#aaa"
                            },

                            grid: {
                                color:
                                    "rgba(255,255,255,.05)"
                            }

                        },

                        y: {

                            ticks: {
                                color: "#aaa"
                            },

                            grid: {
                                color:
                                    "rgba(255,255,255,.05)"
                            }

                        }

                    }

                }

            }
        );

}


/* DOWNLOAD */

function downloadFile(
    name,
    content,
    type
) {

    const blob =
        new Blob(
            [content],
            {type: type}
        );


    const url =
        URL.createObjectURL(blob);


    const a =
        document.createElement("a");


    a.href = url;

    a.download = name;

    a.click();


    URL.revokeObjectURL(url);

}


/* JSON */

$("jsonBtn")
    .addEventListener(
        "click",
        () => {

            downloadFile(

                "logscope_results.json",

                JSON.stringify(
                    errors,
                    null,
                    2
                ),

                "application/json"

            );

        }
    );


/* CSV */

$("csvBtn")
    .addEventListener(
        "click",
        () => {

            const rows = [

                [
                    "Type",
                    "Severity",
                    "Message",
                    "File",
                    "Line",
                    "Occurrences"
                ]

            ];


            errors.forEach(
                error => {

                    rows.push(

                        [

                            error.type ||
                                "",

                            error.severity ||
                                "",

                            error.message ||
                                "",

                            error.file ||
                                "",

                            error.line ||
                                "",

                            error.occurrences ||
                                1

                        ]

                    );

                }
            );


            const csv =
                rows
                    .map(
                        row =>
                            row
                                .map(
                                    value =>
                                        `"${String(
                                            value
                                        ).replaceAll(
                                            '"',
                                            '""'
                                        )}"`
                                )
                                .join(",")
                    )
                    .join("\n");


            downloadFile(

                "logscope_results.csv",

                csv,

                "text/csv"

            );

        }
    );


/* HISTORY */

async function loadHistory() {

    try {

        const response =
            await fetch(
                "/api/history"
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Could not load history"
            );

        }


        const history =
            data.history ||
            [];


        if (!history.length) {

            $("historyContent")
                .innerHTML =
                "No previous analyses found.";

            return;

        }


        $("historyContent")
            .innerHTML =
            `
            <div class="table-wrap">

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
                            history
                                .map(
                                    item =>
                                        `
                                        <tr>

                                            <td>
                                                ${escapeHtml(
                                                    item.id
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    item.source_name
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    item.total_lines
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    item.total_errors
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    item.critical
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    item.warnings
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    item.unique_errors
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

    }

    catch (error) {

        $("historyContent")
            .innerHTML =
            `
            <span class="status error">
                ${escapeHtml(
                    error.message
                )}
            </span>
            `;

    }

}


/* KNOWLEDGE */

async function loadKnowledge() {

    try {

        const response =
            await fetch(
                "/api/knowledge"
            );


        const data =
            await response.json();


        if (!response.ok) {

            return;

        }


        const kb =
            data.stats ||
            data;


        $("kbTotal")
            .textContent =
            kb.total || 0;


        $("kbBuiltIn")
            .textContent =
            kb.built_in || 0;


        $("kbLearned")
            .textContent =
            kb.learned || 0;


        $("kbConfidence")
            .textContent =
            `${Math.round(
                Number(
                    kb.average_confidence ||
                    0
                ) * 100
            )}%`;

    }

    catch {

    }

}


/* INITIAL LOAD */

loadHistory();

loadKnowledge();
