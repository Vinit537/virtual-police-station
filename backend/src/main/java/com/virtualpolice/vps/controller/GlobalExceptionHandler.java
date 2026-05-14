package com.virtualpolice.vps.controller;

import com.virtualpolice.vps.dto.AuthDtos;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private ResponseEntity<?> apiError(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new AuthDtos.ApiErrorResponse(code, message, null));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArg(IllegalArgumentException ex) {
        return apiError(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleState(IllegalStateException ex) {
        return apiError(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(err -> fieldErrors.put(err.getField(), err.getDefaultMessage()));
        String message = fieldErrors.isEmpty() ? "Validation failed" : "Please correct the highlighted fields";
        return ResponseEntity.badRequest().body(new AuthDtos.ApiErrorResponse(
                "VALIDATION_FAILED",
                message,
                fieldErrors
        ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleDenied(AccessDeniedException ex) {
        return apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not authorized to perform this action");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<?> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = "Invalid value for '" + ex.getName() + "' expected a number, got: " + ex.getValue();
        return apiError(HttpStatus.BAD_REQUEST, "INVALID_TYPE", message);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<?> handleAuthFailed(AuthenticationException ex) {
        return apiError(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid email or password");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return apiError(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE", "File too large. Maximum allowed size is 25 MB");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnknown(Exception ex) {
        log.error("Unhandled server exception", ex);
        String message = ex.getMessage() == null || ex.getMessage().isBlank()
                ? "Unexpected server error"
                : ex.getMessage();
        return apiError(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message);
    }
}
