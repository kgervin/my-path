"""Domain errors. The API layer maps these to RFC 9457 problem responses."""


class DomainError(Exception):
    title = "Request could not be completed"


class NotFoundError(DomainError):
    title = "Not found"


class ConflictError(DomainError):
    title = "Changed by someone else"


class InvalidActionError(DomainError):
    title = "Action not allowed"
