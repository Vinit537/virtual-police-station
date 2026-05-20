package com.virtualpolice.vps.dto;

import com.virtualpolice.vps.model.FirStatus;
import com.virtualpolice.vps.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class AuthDtos {
    public record RegisterRequest(
            @NotBlank String fullName,
            @Email String email,
            @Size(min = 8, message = "Password must be at least 8 characters") String password,
            @Pattern(regexp = "\\d{12}") String aadhaarNumber,
            Role role
    ) {
    }

    public record LoginRequest(@Email String email, @NotBlank String password) {
    }

    public record AuthResponse(String token, Role role, String name, String email, String aadhaarNumber, LocalDateTime createdAt) {
    }

    public record ProfileResponse(String name, String email, Role role, String aadhaarNumber, LocalDateTime createdAt) {
    }

    public record OtpGenerateRequest(@Pattern(regexp = "\\d{12}") String aadhaarNumber) {
    }

    public record OtpGenerateResponse(String message, String debugOtp) {
    }

    public record OtpVerifyRequest(@Pattern(regexp = "\\d{12}") String aadhaarNumber, @Pattern(regexp = "\\d{6}") String otp) {
    }

    public record OtpVerifyResponse(boolean verified, String message) {
    }

    public record FirCreateRequest(
            @NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 3000) String description,
            @Size(max = 200) String location,
            @Pattern(regexp = "\\d{12}") String aadhaarNumber,
            @Size(max = 10000) String ocrExtractedText,
            @Size(max = 500) String ocrKeywords
    ) {
    }

    public record OcrExtractResponse(
            String extractedText,
            String extractedName,
            String suggestedLocation,
            String keywords,
            String suggestedCategory,
            String suggestedPriority,
            String suggestedTitle,
            String suggestedDescription
    ) {
    }

    public record FirUpdateRequest(FirStatus status, String category, String priority, Long assignedOfficerId) {
    }

    public record PoliceFirResolveRequest(
            @NotBlank @Size(max = 2000) String closureSummary,
            @NotBlank @Size(max = 2000) String citizenSummary,
            @Size(max = 2000) String officerNote,
            boolean evidenceReviewed
    ) {
    }

    public record PoliceDisputeResponseRequest(
            @NotBlank @Size(max = 2000) String responseNote,
            FirStatus nextStatus,
            @Size(max = 2000) String citizenSummary,
            @Size(max = 2000) String officerNote,
            boolean evidenceReviewed
    ) {
    }

    public record AdminReassignRequest(
            Long officerId,
            @Size(max = 200) String station,
            @Size(max = 1000) String reason
    ) {
    }

    public record AdminPriorityOverrideRequest(
            @NotBlank String priority,
            @NotBlank @Size(max = 1000) String reason
    ) {
    }

    public record AdminEscalateRequest(
            @NotBlank @Size(max = 1000) String note,
            LocalDateTime dueAt
    ) {
    }

    public record AdminRequestUpdateRequest(
            @NotBlank @Size(max = 1000) String message,
            LocalDateTime dueAt
    ) {
    }

    public record AdminReopenReviewRequest(
            FirStatus nextStatus,
            @NotBlank @Size(max = 1000) String reason
    ) {
    }

    public record EvidenceUploadRequest(
            @NotBlank @Size(max = 200) String fileName,
            @NotBlank String fileType,
            @NotBlank @Size(max = 500) String storagePath,
            @Min(1) @Max(5120) Integer fileSizeKb
    ) {
    }

    public record FirResponse(
            Long id,
            String title,
            String description,
            String category,
            FirStatus status,
            String priority,
            String location,
            String assignedStation,
            String extractedName,
            String extractedLocation,
            String extractedCrimeKeywords,
            String extractedText,
            String digitalSignatureHash,
            String citizenName,
            String assignedOfficerName,
            LocalDateTime resolvedAt,
            LocalDateTime acknowledgementDueAt,
            LocalDateTime acknowledgedAt,
            String disputeReason,
            String closureSummary,
            String officerNote,
            LocalDateTime evidenceReviewedAt,
            LocalDateTime disputedAt,
            String disputeResponseNote,
            LocalDateTime disputeRespondedAt,
            LocalDateTime lastOfficerActionAt,
            LocalDateTime escalatedAt,
            String escalatedBy,
            String escalationReason,
            LocalDateTime escalationDueAt,
            String adminRequestUpdateMessage,
            LocalDateTime adminRequestUpdateDueAt,
            LocalDateTime adminRequestUpdateAt,
            String adminRequestUpdateBy,
            LocalDateTime lastAdminActionAt,
            String priorityOverrideReason,
            LocalDateTime createdAt,
            List<EvidenceMetaResponse> evidence,
            List<StatusLogResponse> logs
    ) {
    }

    public record AdminCommandQueueItem(
            Long id,
            String title,
            String description,
            String category,
            FirStatus status,
            String priority,
            String assignedStation,
            String citizenName,
            String citizenAadhaarMasked,
            String assignedOfficerName,
            LocalDateTime createdAt,
            LocalDateTime acknowledgementDueAt,
            boolean isSlaBreached,
            String slaBucket,
            boolean requiresAdminAttention,
            Long pendingCitizenAckHours,
            LocalDateTime escalatedAt,
            String escalatedBy,
            String escalationReason,
            LocalDateTime escalationDueAt,
            LocalDateTime lastPoliceActionAt,
            LocalDateTime lastCitizenActionAt,
            LocalDateTime lastAdminActionAt,
            String adminNotePreview
    ) {
    }

    public record AdminCommandDetailResponse(
            FirResponse fir,
            String citizenEmail,
            String citizenAadhaar,
            boolean isSlaBreached,
            String slaBucket,
            boolean requiresAdminAttention,
            Long pendingCitizenAckHours,
            LocalDateTime escalatedAt,
            String escalatedBy,
            String escalationReason,
            LocalDateTime escalationDueAt,
            LocalDateTime lastPoliceActionAt,
            LocalDateTime lastCitizenActionAt,
            LocalDateTime lastAdminActionAt,
            String adminNotePreview
    ) {
    }

    public record CaseEventDto(
            String eventType,
            String actorRole,
            String actorRef,
            String payloadJson,
            String correlationId,
            LocalDateTime occurredAt
    ) {
    }

    public record SlaSnapshotDto(
            LocalDateTime acknowledgementDueAt,
            String slaBucket,
            boolean breached
    ) {
    }

    public record CaseQueueItemDto(
            Long id,
            String title,
            FirStatus status,
            String priority,
            String assignedStation,
            String citizenName,
            String assignedOfficerName,
            LocalDateTime createdAt,
            boolean requiresAttention
    ) {
    }

    public record CaseDetailResponseDto(
            FirResponse fir,
            SlaSnapshotDto sla,
            List<CaseEventDto> events
    ) {
    }

    public record CaseActionRequestDto(
            String idempotencyKey,
            FirStatus status,
            String category,
            String priority,
            Long assignedOfficerId,
            String station,
            String reason,
            String note,
            String message,
            LocalDateTime dueAt,
            FirStatus nextStatus,
            String citizenSummary,
            String closureSummary,
            String officerNote,
            boolean evidenceReviewed,
            String responseNote,
            String disputeReason
    ) {
    }

    public record FirDraftUpsertRequest(
            @Size(max = 120) String title,
            @Size(max = 3000) String description,
            @Size(max = 200) String location,
            @Pattern(regexp = "\\d{12}") String aadhaarNumber,
            @Size(max = 10000) String ocrExtractedText,
            @Size(max = 500) String ocrKeywords,
            @Size(max = 60) String suggestedCategory,
            @Size(max = 40) String suggestedPriority,
            @Min(1) @Max(5) Integer currentStep
    ) {
    }

    public record FirDraftResponse(
            Long id,
            String title,
            String description,
            String location,
            String aadhaarNumber,
            String ocrExtractedText,
            String ocrKeywords,
            String suggestedCategory,
            String suggestedPriority,
            Integer currentStep,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    public record ResolutionDisputeRequest(@NotBlank @Size(max = 1000) String reason) {
    }

    public record ApiErrorResponse(
            String code,
            String message,
            Map<String, String> fieldErrors,
            String error
    ) {
        public ApiErrorResponse(String code, String message, Map<String, String> fieldErrors) {
            this(code, message, fieldErrors, message);
        }
    }

    public record StatusLogResponse(FirStatus status, String updatedBy, LocalDateTime updatedAt) {
    }

    public record DashboardStats(long users, long officers, long firs, long activeCases) {
    }

        public record AdminAnalytics(
                        DashboardStats stats,
                        List<KeyValueCount> firByCategory,
                        List<KeyValueCount> firByStatus
        ) {
        }

        public record KeyValueCount(String key, long count) {
        }

        public record EventLogResponse(String eventType, String message, LocalDateTime createdAt) {
        }

        public record EvidenceMetaResponse(
                Long id,
                String fileName,
                String fileType,
                long fileSizeBytes,
                LocalDateTime uploadedAt
        ) {
        }
}
