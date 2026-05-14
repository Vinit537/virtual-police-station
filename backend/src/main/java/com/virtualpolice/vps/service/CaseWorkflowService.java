package com.virtualpolice.vps.service;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.CaseEvent;
import com.virtualpolice.vps.model.FirReport;
import com.virtualpolice.vps.model.FirStatus;
import com.virtualpolice.vps.model.Role;
import com.virtualpolice.vps.model.UserAccount;
import com.virtualpolice.vps.repository.CaseEventRepository;
import com.virtualpolice.vps.repository.FirReportRepository;
import com.virtualpolice.vps.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
public class CaseWorkflowService {
    private final UserRepository userRepository;
    private final FirReportRepository firReportRepository;
    private final CaseEventRepository caseEventRepository;
    private final FirService firService;
    private final AdminService adminService;

    public CaseWorkflowService(UserRepository userRepository,
                               FirReportRepository firReportRepository,
                               CaseEventRepository caseEventRepository,
                               FirService firService,
                               AdminService adminService) {
        this.userRepository = userRepository;
        this.firReportRepository = firReportRepository;
        this.caseEventRepository = caseEventRepository;
        this.firService = firService;
        this.adminService = adminService;
    }

    @Transactional(readOnly = true)
    public List<AuthDtos.CaseQueueItemDto> getQueue(String email,
                                                    String status,
                                                    String station,
                                                    String assignee,
                                                    String priority,
                                                    String slaBucket) {
        UserAccount actor = findUser(email);
        List<AuthDtos.FirResponse> source = switch (actor.getRole()) {
            case CITIZEN -> firService.getCitizenFirs(email);
            case POLICE -> firService.getPoliceQueue(status, station, assignee, priority, slaBucket);
            case ADMIN -> adminService.getCommandQueue(null, status, priority, station, assignee, slaBucket, null)
                    .stream()
                    .map(item -> firService.getFirDetail(item.id()))
                    .toList();
        };
        return source.stream()
                .sorted(Comparator.comparingLong(this::rankForQueue))
                .map(this::toQueueItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public AuthDtos.CaseDetailResponseDto getCaseDetail(String email, Long firId) {
        UserAccount actor = findUser(email);
        AuthDtos.FirResponse fir = switch (actor.getRole()) {
            case CITIZEN -> firService.getCitizenFirDetail(email, firId);
            case POLICE, ADMIN -> firService.getFirDetail(firId);
        };
        List<AuthDtos.CaseEventDto> events = caseEventRepository.findByFirIdOrderByOccurredAtAsc(firId).stream()
                .map(this::toEventDto)
                .toList();
        return new AuthDtos.CaseDetailResponseDto(fir, computeSla(fir), events);
    }

    @Transactional
    public AuthDtos.CaseDetailResponseDto applyAction(String email,
                                                      Long firId,
                                                      String actionType,
                                                      AuthDtos.CaseActionRequestDto request) {
        UserAccount actor = findUser(email);
        String action = actionType == null ? "" : actionType.trim().toUpperCase();
        String actorRole = actor.getRole().name();
        String correlationId = request.idempotencyKey();

        if (correlationId != null && !correlationId.isBlank()) {
            boolean seen = caseEventRepository.findFirstByFirIdAndCorrelationIdOrderByOccurredAtDesc(firId, correlationId).isPresent();
            if (seen) {
                return getCaseDetail(email, firId);
            }
        }

        AuthDtos.FirResponse updated = switch (action) {
            case "ACKNOWLEDGE" -> {
                requireRole(actor, Role.CITIZEN);
                yield firService.acknowledgeResolution(email, firId);
            }
            case "DISPUTE" -> {
                requireRole(actor, Role.CITIZEN);
                yield firService.disputeResolution(email, firId, request.disputeReason());
            }
            case "RESOLVE" -> {
                requireAnyRole(actor, Role.POLICE, Role.ADMIN);
                yield firService.resolveFir(
                        firId,
                        email,
                        new AuthDtos.PoliceFirResolveRequest(
                                safe(request.closureSummary()),
                                safe(request.citizenSummary()),
                                request.officerNote(),
                                request.evidenceReviewed()
                        )
                );
            }
            case "DISPUTE_RESPOND" -> {
                requireAnyRole(actor, Role.POLICE, Role.ADMIN);
                yield firService.respondToDispute(
                        firId,
                        email,
                        new AuthDtos.PoliceDisputeResponseRequest(
                                safe(request.responseNote()),
                                request.nextStatus(),
                                request.citizenSummary(),
                                request.officerNote(),
                                request.evidenceReviewed()
                        )
                );
            }
            case "ADMIN_REASSIGN" -> {
                requireRole(actor, Role.ADMIN);
                yield adminService.reassignCase(
                        firId,
                        email,
                        new AuthDtos.AdminReassignRequest(request.assignedOfficerId(), request.station(), request.reason())
                ).fir();
            }
            case "ADMIN_PRIORITY_OVERRIDE" -> {
                requireRole(actor, Role.ADMIN);
                yield adminService.priorityOverride(
                        firId,
                        email,
                        new AuthDtos.AdminPriorityOverrideRequest(safe(request.priority()), safe(request.reason()))
                ).fir();
            }
            case "ADMIN_ESCALATE" -> {
                requireRole(actor, Role.ADMIN);
                yield adminService.escalate(
                        firId,
                        email,
                        new AuthDtos.AdminEscalateRequest(safe(request.note()), request.dueAt())
                ).fir();
            }
            case "ADMIN_REQUEST_UPDATE" -> {
                requireRole(actor, Role.ADMIN);
                yield adminService.requestPoliceUpdate(
                        firId,
                        email,
                        new AuthDtos.AdminRequestUpdateRequest(safe(request.message()), request.dueAt())
                ).fir();
            }
            case "ADMIN_REOPEN_REVIEW" -> {
                requireRole(actor, Role.ADMIN);
                yield adminService.reopenForReview(
                        firId,
                        email,
                        new AuthDtos.AdminReopenReviewRequest(request.nextStatus(), safe(request.reason()))
                ).fir();
            }
            case "UPDATE" -> {
                requireAnyRole(actor, Role.POLICE, Role.ADMIN);
                yield firService.updateFir(
                        firId,
                        email,
                        new AuthDtos.FirUpdateRequest(request.status(), request.category(), request.priority(), request.assignedOfficerId())
                );
            }
            default -> throw new IllegalArgumentException("Unsupported actionType: " + actionType);
        };

        saveEvent(firId, action, actorRole, email, buildPayload(request), correlationId);
        return getCaseDetail(email, updated.id());
    }

    public void logSystemEvent(Long firId, String eventType, String payload) {
        saveEvent(firId, eventType, "SYSTEM", "SYSTEM", payload, null);
    }

    private UserAccount findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private void requireRole(UserAccount actor, Role requiredRole) {
        if (actor.getRole() != requiredRole) {
            throw new IllegalStateException("Action requires role: " + requiredRole);
        }
    }

    private void requireAnyRole(UserAccount actor, Role... roles) {
        for (Role role : roles) {
            if (actor.getRole() == role) {
                return;
            }
        }
        throw new IllegalStateException("Action not permitted for role: " + actor.getRole());
    }

    private void saveEvent(Long firId,
                           String eventType,
                           String actorRole,
                           String actorRef,
                           String payloadJson,
                           String correlationId) {
        FirReport fir = firReportRepository.findById(firId)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        CaseEvent event = new CaseEvent();
        event.setFir(fir);
        event.setEventType(eventType);
        event.setActorRole(actorRole);
        event.setActorRef(actorRef);
        event.setPayloadJson(payloadJson);
        event.setCorrelationId(correlationId);
        caseEventRepository.save(event);
    }

    private String buildPayload(AuthDtos.CaseActionRequestDto request) {
        return "{\"status\":\"" + value(request.status()) + "\",\"nextStatus\":\"" + value(request.nextStatus()) + "\"}";
    }

    private String value(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private AuthDtos.CaseEventDto toEventDto(CaseEvent event) {
        return new AuthDtos.CaseEventDto(
                event.getEventType(),
                event.getActorRole(),
                event.getActorRef(),
                event.getPayloadJson(),
                event.getCorrelationId(),
                event.getOccurredAt()
        );
    }

    private AuthDtos.SlaSnapshotDto computeSla(AuthDtos.FirResponse fir) {
        LocalDateTime dueAt = fir.acknowledgementDueAt();
        if (fir.status() != FirStatus.AWAITING_CITIZEN_ACK || dueAt == null) {
            return new AuthDtos.SlaSnapshotDto(null, "NONE", false);
        }
        long hours = ChronoUnit.HOURS.between(LocalDateTime.now(), dueAt);
        String bucket = hours < 0 ? "OVERDUE" : (hours <= 24 ? "DUE_24H" : (hours <= 72 ? "DUE_3D" : "OPEN"));
        return new AuthDtos.SlaSnapshotDto(dueAt, bucket, hours < 0);
    }

    private long rankForQueue(AuthDtos.FirResponse fir) {
        long base = switch (fir.status()) {
            case DISPUTED_REVIEW -> 0L;
            case AWAITING_CITIZEN_ACK -> {
                boolean overdue = fir.acknowledgementDueAt() != null && fir.acknowledgementDueAt().isBefore(LocalDateTime.now());
                yield overdue ? 1L : 2L;
            }
            case INVESTIGATING -> 3L;
            case UNDER_REVIEW -> 4L;
            case SUBMITTED -> 5L;
            default -> 6L;
        };
        return base * 1_000_000_000L + (fir.id() == null ? 0L : fir.id());
    }

    private AuthDtos.CaseQueueItemDto toQueueItem(AuthDtos.FirResponse fir) {
        boolean needsAttention = fir.status() == FirStatus.DISPUTED_REVIEW
                || (fir.status() == FirStatus.AWAITING_CITIZEN_ACK && fir.acknowledgementDueAt() != null
                && fir.acknowledgementDueAt().isBefore(LocalDateTime.now()));
        return new AuthDtos.CaseQueueItemDto(
                fir.id(),
                fir.title(),
                fir.status(),
                fir.priority(),
                fir.assignedStation(),
                fir.citizenName(),
                fir.assignedOfficerName(),
                fir.createdAt(),
                needsAttention
        );
    }
}
