class RtrqError(Exception):
    """Base class for RTRQ core errors."""


class UnknownAppError(RtrqError):
    """Raised when an app ID does not exist."""


class InvalidApiKeyError(RtrqError):
    """Raised when an API key does not match the configured app key."""


class InvalidOriginError(RtrqError):
    """Raised when a WebSocket origin is not allowed for an app."""


class InvalidQueryKeyError(RtrqError, ValueError):
    """Raised when a query key cannot be represented as JSON."""
