from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(code="NOT_FOUND", message=message, status_code=404)


class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=422)


class AuthenticationError(AppError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(code="AUTH_ERROR", message=message, status_code=401)


class AuthorizationError(AppError):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


class ForbiddenError(AuthorizationError):
    """Alias for AuthorizationError (HTTP 403 Forbidden)."""
    pass


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(code="CONFLICT", message=message, status_code=409)


class RateLimitError(AppError):
    def __init__(self, message: str = "Too many requests"):
        super().__init__(code="RATE_LIMITED", message=message, status_code=429)


class SMSGateError(AppError):
    def __init__(self, message: str = "SMS service unavailable"):
        super().__init__(code="SMS_GATE_ERROR", message=message, status_code=502)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_exception_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        first_err = exc.errors()[0] if exc.errors() else {}
        msg = first_err.get("msg", "Validation failed")
        loc = ".".join(str(x) for x in first_err.get("loc", []) if x != "body")
        full_msg = f"{loc}: {msg}" if loc else str(msg)
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "VALIDATION_ERROR", "message": full_msg}},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": code, "message": str(exc.detail)}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                }
            },
        )
