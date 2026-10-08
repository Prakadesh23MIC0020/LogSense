import re


ERROR_WORDS = [
    "ERROR",
    "ERR",
    "FATAL",
    "CRITICAL",
    "EXCEPTION",
    "TRACEBACK",
    "FAILED",
    "FAILURE",
    "SEVERE",
    "PANIC"
]


EXCEPTION_PATTERNS = [
    r"\bNullPointerException\b",
    r"\bIndexOutOfBoundsException\b",
    r"\bArrayIndexOutOfBoundsException\b",
    r"\bStringIndexOutOfBoundsException\b",
    r"\bFileNotFoundException\b",
    r"\bNoSuchFileException\b",
    r"\bAccessDeniedException\b",
    r"\bFileSystemException\b",
    r"\bEOFException\b",
    r"\bIOException\b",
    r"\bSQLException\b",
    r"\bRuntimeException\b",
    r"\bIllegalArgumentException\b",
    r"\bIllegalStateException\b",
    r"\bUnsupportedOperationException\b",
    r"\bConcurrentModificationException\b",
    r"\bClassNotFoundException\b",
    r"\bNoClassDefFoundError\b",
    r"\bNoSuchMethodError\b",
    r"\bNumberFormatException\b",
    r"\bSecurityException\b",
    r"\bArithmeticException\b",
    r"\bStackOverflowError\b",
    r"\bOutOfMemoryError\b",
    r"\bCompletionException\b",
    r"\bExecutionException\b",
    r"\bRejectedExecutionException\b",
    r"\bProgrammingError\b",
    r"\bOperationalError\b",
    r"\bKeyError\b",
    r"\bIndexError\b",
    r"\bTypeError\b",
    r"\bValueError\b",
    r"\bAttributeError\b",
    r"\bImportError\b",
    r"\bModuleNotFoundError\b",
    r"\bConnectionError\b",
    r"\bTimeoutError\b",
    r"\bPermissionError\b",
    r"\bMemoryError\b",
    r"\bRuntimeError\b"
]


def contains_error_word(line):
    for word in ERROR_WORDS:

        if re.search(
            r"\b" + re.escape(word) + r"\b",
            line,
            re.IGNORECASE
        ):
            return True

    return False


def detect_exception(line):
    for pattern in EXCEPTION_PATTERNS:

        match = re.search(
            pattern,
            line,
            re.IGNORECASE
        )

        if match:
            return match.group(0)

    return None


def detect_special_error(line):

    patterns = {

        "ConnectionRefused": [
            r"connection refused",
            r"connect\(\) failed",
            r"actively refused"
        ],

        "Permission Denied": [
            r"permission denied",
            r"access denied",
            r"access is denied"
        ],

        "Authentication Failure": [
            r"authentication failed",
            r"authentication failure",
            r"login failed",
            r"invalid credentials",
            r"access denied for user"
        ],

        "TimeoutError": [
            r"timed out",
            r"timeout",
            r"request timeout"
        ],

        "Database Error": [
            r"database error",
            r"database connection failed",
            r"sql error",
            r"sqlstate"
        ]
    }

    for name, patterns_list in patterns.items():

        for pattern in patterns_list:

            if re.search(
                pattern,
                line,
                re.IGNORECASE
            ):
                return name

    return None