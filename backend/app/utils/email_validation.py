from email_validator import EmailNotValidError, validate_email
from disposable_email_domains import blocklist

_DNS_TIMEOUT_SECONDS = 3


class EmailValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_registration_email(email: str) -> str:
    try:
        syntax_result = validate_email(email, check_deliverability=False)
    except EmailNotValidError as e:
        raise EmailValidationError(str(e)) from e

    if syntax_result.ascii_domain.lower() in blocklist:
        raise EmailValidationError("Disposable email addresses are not allowed. Please use a permanent email address.")

    try:
        deliverability_result = validate_email(
            email,
            check_deliverability=True,
            timeout=_DNS_TIMEOUT_SECONDS,
        )
    except EmailNotValidError as e:
        raise EmailValidationError(str(e)) from e

    if getattr(deliverability_result, "mx", None) is None:
        raise EmailValidationError(
            "We couldn't verify that this email address can receive mail. Please try again in a moment."
        )

    return deliverability_result.normalized.lower()
