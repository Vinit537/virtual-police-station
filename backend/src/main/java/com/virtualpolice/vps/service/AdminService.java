package com.virtualpolice.vps.service;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.FirReport;
import com.virtualpolice.vps.model.FirStatus;
import com.virtualpolice.vps.model.PoliceOfficer;
import com.virtualpolice.vps.model.Role;
import com.virtualpolice.vps.model.UserAccount;
import com.virtualpolice.vps.repository.EvidenceRepository;
import com.virtualpolice.vps.repository.FirReportRepository;
import com.virtualpolice.vps.repository.PoliceOfficerRepository;
import com.virtualpolice.vps.repository.StatusLogRepository;
import com.virtualpolice.vps.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdminService {
    private static final Set<FirStatus> CLOSED_STATES = Set.of(FirStatus.CLOSED_CONFIRMED, FirStatus.CLOSED_AUTO_ACK);

    private final UserRepository userRepository;
    private final PoliceOfficerRepository policeOfficerRepository;
    private final FirReportRepository firReportRepository;
    private final EvidenceRepository evidenceRepository;
    private final StatusLogRepository statusLogRepository;
    private final NotificationService notificationService;
    private final FirService firService;

    public AdminService(UserRepository userRepository,
                        PoliceOfficerRepository policeOfficerRepository,
                        FirReportRepository firReportRepository,
                        EvidenceRepository evidenceRepository,
                        StatusLogRepository statusLogRepository,
                        NotificationService notificationService,
                        FirService firService) {
        this.userRepository = userRepository;
        this.policeOfficerRepository = policeOfficerRepository;
        this.firReportRepository = firReportRepository;
        this.evidenceRepository = evidenceRepository;
        this.statusLogRepository = statusLogRepository;
        this.notificationService = notificationService;
        this.firService = firService;
    }

    public AuthDtos.DashboardStats stats() {
        long activeCases = firReportRepository.findAll().stream()
                .filter(f -> !CLOSED_STATES.contains(f.getStatus()))
                .count();
        return new AuthDtos.DashboardStats(
                userRepository.count(),
                policeOfficerRepository.count(),
                firReportRepository.count(),
                activeCases
        );
    }

    public AuthDtos.AdminAnalytics analytics() {
        List<FirReport> all = firReportRepository.findAll();

        Map<String, Long> byCategory = all.stream()
                .collect(Collectors.groupingBy(FirReport::getCategory, Collectors.counting()));
        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(report -> report.getStatus().name(), Collectors.counting()));

        return new AuthDtos.AdminAnalytics(
                stats(),
                byCategory.entrySet().stream().map(e -> new AuthDtos.KeyValueCount(e.getKey(), e.getValue())).toList(),
                byStatus.entrySet().stream().map(e -> new AuthDtos.KeyValueCount(e.getKey(), e.getValue())).toList()
        );
    }

    /** Returns daily FIR counts for the last 30 days, grouped by category. */
    public List<Map<String, Object>> crimeTrend() {
        List<FirReport> all = firReportRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(29);

        Set<String> categories = all.stream()
                .map(FirReport::getCategory)
                .collect(Collectors.toSet());

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (int i = 0; i < 30; i++) {
            LocalDate date = start.plusDays(i);
            Map<String, Object> dayEntry = new java.util.LinkedHashMap<>();
            dayEntry.put("date", date.toString());

            long dayTotal = 0;
            for (String cat : categories) {
                long count = all.stream()
                        .filter(f -> f.getCreatedAt().toLocalDate().equals(date) && Objects.equals(f.getCategory(), cat))
                        .count();
                dayEntry.put(cat, count);
                dayTotal += count;
            }
            dayEntry.put("total", dayTotal);
            result.add(dayEntry);
        }
        return result;
    }

    public List<AuthDtos.EventLogResponse> recentEvents() {
        return notificationService.recentEvents();
    }

    @Transactional(readOnly = true)
    public List<AuthDtos.AdminCommandQueueItem> getCommandQueue(String preset,
                                                                String status,
                                                                String priority,
                                                                String station,
                                                                String assignee,
                                                                String slaBucket,
                                                                Boolean escalated) {
        LocalDateTime now = LocalDateTime.now();
        return firReportRepository.findAll().stream()
                .filter(fir -> matchesPreset(fir, preset, now))
                .filter(fir -> matchesStatus(fir, status))
                .filter(fir -> matchesExact(fir.getPriority(), priority))
                .filter(fir -> matchesContains(fir.getAssignedStation(), station))
                .filter(fir -> matchesContains(getOfficerName(fir), assignee))
                .filter(fir -> matchesSlaBucket(fir, slaBucket, now))
                .filter(fir -> matchesEscalated(fir, escalated))
                .sorted(Comparator.comparingLong(fir -> rankScore(fir, now)))
                .map(fir -> toQueueItem(fir, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public AuthDtos.AdminCommandDetailResponse getCommandDetail(Long id) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        LocalDateTime now = LocalDateTime.now();
        return toDetailResponse(fir, now);
    }

    @Transactional
    public AuthDtos.AdminCommandDetailResponse reassignCase(Long id,
                                                            String adminEmail,
                                                            AuthDtos.AdminReassignRequest request) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        ensureNotClosed(fir);

        if (request.officerId() == null && (request.station() == null || request.station().isBlank())) {
            throw new IllegalArgumentException("Provide officerId or station for reassignment");
        }

        if (request.officerId() != null) {
            PoliceOfficer officer = policeOfficerRepository.findById(request.officerId())
                    .orElseThrow(() -> new IllegalArgumentException("Officer not found"));
            fir.setAssignedOfficer(officer);
            if (request.station() == null || request.station().isBlank()) {
                fir.setAssignedStation(officer.getStationName());
            }
        }
        if (request.station() != null && !request.station().isBlank()) {
            fir.setAssignedStation(request.station().trim());
        }

        stampAdminAction(fir, adminEmail);
        notificationService.logEvent("ADMIN_REASSIGN",
                "Admin reassigned FIR #" + fir.getId() + " by " + adminEmail + withReasonSuffix(request.reason()));
        firReportRepository.save(fir);
        return getCommandDetail(id);
    }

    @Transactional
    public AuthDtos.AdminCommandDetailResponse priorityOverride(Long id,
                                                                String adminEmail,
                                                                AuthDtos.AdminPriorityOverrideRequest request) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        ensureNotClosed(fir);

        String normalizedPriority = request.priority() == null ? "" : request.priority().trim().toUpperCase();
        if (!Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL").contains(normalizedPriority)) {
            throw new IllegalArgumentException("Priority must be LOW, MEDIUM, HIGH, or CRITICAL");
        }
        fir.setPriority(normalizedPriority);
        fir.setPriorityOverrideReason(request.reason().trim());
        stampAdminAction(fir, adminEmail);
        notificationService.logEvent("ADMIN_PRIORITY_OVERRIDE",
                "Admin set FIR #" + fir.getId() + " priority to " + normalizedPriority + " by " + adminEmail);
        firReportRepository.save(fir);
        return getCommandDetail(id);
    }

    @Transactional
    public AuthDtos.AdminCommandDetailResponse escalate(Long id,
                                                        String adminEmail,
                                                        AuthDtos.AdminEscalateRequest request) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        ensureNotClosed(fir);

        LocalDateTime now = LocalDateTime.now();
        fir.setEscalatedAt(now);
        fir.setEscalatedBy(adminEmail);
        fir.setEscalationReason(request.note().trim());
        fir.setEscalationDueAt(request.dueAt());
        stampAdminAction(fir, adminEmail);
        notificationService.logEvent("ADMIN_ESCALATED",
                "Admin escalated FIR #" + fir.getId() + " by " + adminEmail);
        firReportRepository.save(fir);
        return getCommandDetail(id);
    }

    @Transactional
    public AuthDtos.AdminCommandDetailResponse requestPoliceUpdate(Long id,
                                                                   String adminEmail,
                                                                   AuthDtos.AdminRequestUpdateRequest request) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        ensureNotClosed(fir);

        LocalDateTime now = LocalDateTime.now();
        fir.setAdminRequestUpdateMessage(request.message().trim());
        fir.setAdminRequestUpdateDueAt(request.dueAt());
        fir.setAdminRequestUpdateAt(now);
        fir.setAdminRequestUpdateBy(adminEmail);
        stampAdminAction(fir, adminEmail);
        notificationService.logEvent("ADMIN_UPDATE_REQUESTED",
                "Admin requested update on FIR #" + fir.getId() + " by " + adminEmail);
        firReportRepository.save(fir);
        return getCommandDetail(id);
    }

    @Transactional
    public AuthDtos.AdminCommandDetailResponse reopenForReview(Long id,
                                                               String adminEmail,
                                                               AuthDtos.AdminReopenReviewRequest request) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));

        FirStatus next = request.nextStatus() == null ? FirStatus.UNDER_REVIEW : request.nextStatus();
        if (next != FirStatus.UNDER_REVIEW && next != FirStatus.INVESTIGATING) {
            throw new IllegalArgumentException("nextStatus must be UNDER_REVIEW or INVESTIGATING");
        }

        fir.setStatus(next);
        fir.setAdminRequestUpdateMessage("Reopened for review: " + request.reason().trim());
        fir.setAdminRequestUpdateAt(LocalDateTime.now());
        fir.setAdminRequestUpdateBy(adminEmail);
        stampAdminAction(fir, adminEmail);
        statusLogRepository.save(buildStatusLog(fir, next, "ADMIN:" + adminEmail));
        notificationService.logEvent("ADMIN_REOPENED_REVIEW",
                "Admin reopened FIR #" + fir.getId() + " to " + next + " by " + adminEmail);
        firReportRepository.save(fir);
        return getCommandDetail(id);
    }

    @Transactional
    public long purgePoliceAndCitizenUsers() {
        List<UserAccount> usersToDelete = userRepository.findByRoleIn(EnumSet.of(Role.CITIZEN, Role.POLICE));
        if (usersToDelete.isEmpty()) {
            return 0;
        }

        List<Long> userIds = usersToDelete.stream().map(UserAccount::getId).toList();

        List<PoliceOfficer> officersToDelete = policeOfficerRepository.findAll().stream()
                .filter(officer -> userIds.contains(officer.getUser().getId()))
                .toList();
        List<Long> officerIds = officersToDelete.stream().map(PoliceOfficer::getId).toList();

        if (!officerIds.isEmpty()) {
            List<FirReport> officerAssignedFirs = firReportRepository.findByAssignedOfficerIdIn(officerIds);
            officerAssignedFirs.forEach(fir -> fir.setAssignedOfficer(null));
            firReportRepository.saveAll(officerAssignedFirs);
        }

        List<FirReport> citizenFirs = firReportRepository.findByCitizenIdIn(userIds);
        List<Long> firIds = citizenFirs.stream().map(FirReport::getId).toList();
        if (!firIds.isEmpty()) {
            evidenceRepository.deleteByFirIdIn(firIds);
            statusLogRepository.deleteByFirIdIn(firIds);
            firReportRepository.deleteAll(citizenFirs);
        }

        if (!officersToDelete.isEmpty()) {
            policeOfficerRepository.deleteAll(officersToDelete);
        }

        userRepository.deleteAll(usersToDelete);
        return usersToDelete.size();
    }

    private void ensureNotClosed(FirReport fir) {
        if (CLOSED_STATES.contains(fir.getStatus())) {
            throw new IllegalStateException("Closed FIR is read-only for admin interventions");
        }
    }

    private String getOfficerName(FirReport fir) {
        if (fir.getAssignedOfficer() == null || fir.getAssignedOfficer().getUser() == null) {
            return null;
        }
        return fir.getAssignedOfficer().getUser().getFullName();
    }

    private FirStatus safeStatus(FirReport fir) {
        return fir.getStatus() == null ? FirStatus.SUBMITTED : fir.getStatus();
    }

    private String safeCitizenName(FirReport fir) {
        if (fir.getCitizen() == null || fir.getCitizen().getFullName() == null || fir.getCitizen().getFullName().isBlank()) {
            return "Unknown Citizen";
        }
        return fir.getCitizen().getFullName();
    }

    private String safeCitizenEmail(FirReport fir) {
        if (fir.getCitizen() == null || fir.getCitizen().getEmail() == null || fir.getCitizen().getEmail().isBlank()) {
            return "unknown@unknown";
        }
        return fir.getCitizen().getEmail();
    }

    private String safeCitizenAadhaar(FirReport fir) {
        if (fir.getCitizen() == null) {
            return "****";
        }
        return maskAadhaar(fir.getCitizen().getAadhaarNumber());
    }

    private String maskAadhaar(String aadhaarNumber) {
        if (aadhaarNumber == null || aadhaarNumber.length() < 4) {
            return "****";
        }
        return "********" + aadhaarNumber.substring(aadhaarNumber.length() - 4);
    }

    private void stampAdminAction(FirReport fir, String adminEmail) {
        fir.setLastAdminActionAt(LocalDateTime.now());
        if (fir.getEscalatedBy() == null && fir.getEscalatedAt() != null) {
            fir.setEscalatedBy(adminEmail);
        }
    }

    private String withReasonSuffix(String reason) {
        if (reason == null || reason.isBlank()) {
            return "";
        }
        return " (reason: " + reason.trim() + ")";
    }

    private boolean matchesContains(String source, String query) {
        if (query == null || query.isBlank()) {
            return true;
        }
        if (source == null) {
            return false;
        }
        return source.toLowerCase().contains(query.trim().toLowerCase());
    }

    private boolean matchesExact(String source, String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        if (source == null) {
            return false;
        }
        return source.equalsIgnoreCase(value.trim());
    }

    private boolean matchesStatus(FirReport fir, String status) {
        if (status == null || status.isBlank()) {
            return true;
        }
        return safeStatus(fir).name().equalsIgnoreCase(status.trim());
    }

    private boolean matchesEscalated(FirReport fir, Boolean escalated) {
        if (escalated == null) {
            return true;
        }
        return escalated ? fir.getEscalatedAt() != null : fir.getEscalatedAt() == null;
    }

    private boolean matchesSlaBucket(FirReport fir, String bucket, LocalDateTime now) {
        if (bucket == null || bucket.isBlank()) {
            return true;
        }
        String actual = computeSlaBucket(fir, now);
        return actual.equalsIgnoreCase(bucket.trim());
    }

    private boolean matchesPreset(FirReport fir, String preset, LocalDateTime now) {
        if (preset == null || preset.isBlank()) {
            return true;
        }
        FirStatus status = safeStatus(fir);
        boolean breached = isSlaBreached(fir, now);
        return switch (preset.trim().toUpperCase()) {
            case "CRITICAL_ATTENTION" -> status == FirStatus.DISPUTED_REVIEW || breached;
            case "SLA_BREACHES" -> breached;
            case "DISPUTED_REVIEW_WATCH" -> status == FirStatus.DISPUTED_REVIEW;
            case "AWAITING_CITIZEN_ACK_WATCH" -> status == FirStatus.AWAITING_CITIZEN_ACK;
            case "CLOSED_AUDIT_ARCHIVE" -> CLOSED_STATES.contains(status);
            default -> true;
        };
    }

    private boolean isSlaBreached(FirReport fir, LocalDateTime now) {
        if (safeStatus(fir) == FirStatus.AWAITING_CITIZEN_ACK
                && fir.getAcknowledgementDueAt() != null
                && fir.getAcknowledgementDueAt().isBefore(now)) {
            return true;
        }
        return fir.getEscalationDueAt() != null && fir.getEscalationDueAt().isBefore(now);
    }

    private String computeSlaBucket(FirReport fir, LocalDateTime now) {
        if (safeStatus(fir) != FirStatus.AWAITING_CITIZEN_ACK || fir.getAcknowledgementDueAt() == null) {
            return "NONE";
        }
        long hours = ChronoUnit.HOURS.between(now, fir.getAcknowledgementDueAt());
        if (hours < 0) return "OVERDUE";
        if (hours <= 24) return "DUE_24H";
        if (hours <= 72) return "DUE_3D";
        return "OPEN";
    }

    private long computePendingCitizenAckHours(FirReport fir, LocalDateTime now) {
        if (safeStatus(fir) != FirStatus.AWAITING_CITIZEN_ACK || fir.getAcknowledgementDueAt() == null) {
            return 0L;
        }
        return ChronoUnit.HOURS.between(now, fir.getAcknowledgementDueAt());
    }

    private boolean requiresAdminAttention(FirReport fir, LocalDateTime now) {
        FirStatus status = safeStatus(fir);
        if (status == FirStatus.DISPUTED_REVIEW) {
            return true;
        }
        if (isSlaBreached(fir, now)) {
            return true;
        }
        return status == FirStatus.AWAITING_CITIZEN_ACK
                && fir.getAcknowledgementDueAt() != null
                && ChronoUnit.HOURS.between(now, fir.getAcknowledgementDueAt()) <= 24;
    }

    private long rankScore(FirReport fir, LocalDateTime now) {
        FirStatus status = safeStatus(fir);
        long due = fir.getAcknowledgementDueAt() != null
                ? fir.getAcknowledgementDueAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
                : Long.MAX_VALUE;
        long created = fir.getCreatedAt() != null
                ? fir.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
                : 0L;
        long base = switch (status) {
            case DISPUTED_REVIEW -> 0L;
            case AWAITING_CITIZEN_ACK -> isSlaBreached(fir, now) ? 1L : 2L;
            case INVESTIGATING -> 3L;
            case UNDER_REVIEW -> 4L;
            case SUBMITTED -> 5L;
            default -> CLOSED_STATES.contains(status) ? 6L : 7L;
        };
        return base * 10_000_000_000_000L + (status == FirStatus.AWAITING_CITIZEN_ACK ? due : created);
    }

    private LocalDateTime lastCitizenActionAt(FirReport fir) {
        LocalDateTime result = fir.getCreatedAt();
        if (fir.getAcknowledgedAt() != null && (result == null || fir.getAcknowledgedAt().isAfter(result))) {
            result = fir.getAcknowledgedAt();
        }
        if (fir.getDisputedAt() != null && (result == null || fir.getDisputedAt().isAfter(result))) {
            result = fir.getDisputedAt();
        }
        return result;
    }

    private String buildAdminNotePreview(FirReport fir) {
        if (fir.getEscalationReason() != null && !fir.getEscalationReason().isBlank()) {
            return fir.getEscalationReason().length() > 120
                    ? fir.getEscalationReason().substring(0, 120) + "..."
                    : fir.getEscalationReason();
        }
        if (fir.getAdminRequestUpdateMessage() != null && !fir.getAdminRequestUpdateMessage().isBlank()) {
            return fir.getAdminRequestUpdateMessage().length() > 120
                    ? fir.getAdminRequestUpdateMessage().substring(0, 120) + "..."
                    : fir.getAdminRequestUpdateMessage();
        }
        if (fir.getPriorityOverrideReason() != null && !fir.getPriorityOverrideReason().isBlank()) {
            return fir.getPriorityOverrideReason().length() > 120
                    ? fir.getPriorityOverrideReason().substring(0, 120) + "..."
                    : fir.getPriorityOverrideReason();
        }
        return "";
    }

    private AuthDtos.AdminCommandQueueItem toQueueItem(FirReport fir, LocalDateTime now) {
        boolean breached = isSlaBreached(fir, now);
        String slaBucket = computeSlaBucket(fir, now);
        return new AuthDtos.AdminCommandQueueItem(
                fir.getId(),
                fir.getTitle(),
                fir.getDescription(),
                fir.getCategory(),
                safeStatus(fir),
                fir.getPriority(),
                fir.getAssignedStation(),
                safeCitizenName(fir),
                safeCitizenAadhaar(fir),
                getOfficerName(fir),
                fir.getCreatedAt(),
                fir.getAcknowledgementDueAt(),
                breached,
                slaBucket,
                requiresAdminAttention(fir, now),
                computePendingCitizenAckHours(fir, now),
                fir.getEscalatedAt(),
                fir.getEscalatedBy(),
                fir.getEscalationReason(),
                fir.getEscalationDueAt(),
                fir.getLastOfficerActionAt(),
                lastCitizenActionAt(fir),
                fir.getLastAdminActionAt(),
                buildAdminNotePreview(fir)
        );
    }

    private AuthDtos.AdminCommandDetailResponse toDetailResponse(FirReport fir, LocalDateTime now) {
        AuthDtos.FirResponse response = firService.getFirDetail(fir.getId());
        return new AuthDtos.AdminCommandDetailResponse(
                response,
                safeCitizenEmail(fir),
                fir.getCitizen() != null && fir.getCitizen().getAadhaarNumber() != null ? fir.getCitizen().getAadhaarNumber() : "****",
                isSlaBreached(fir, now),
                computeSlaBucket(fir, now),
                requiresAdminAttention(fir, now),
                computePendingCitizenAckHours(fir, now),
                fir.getEscalatedAt(),
                fir.getEscalatedBy(),
                fir.getEscalationReason(),
                fir.getEscalationDueAt(),
                fir.getLastOfficerActionAt(),
                lastCitizenActionAt(fir),
                fir.getLastAdminActionAt(),
                buildAdminNotePreview(fir)
        );
    }

    private com.virtualpolice.vps.model.StatusLog buildStatusLog(FirReport fir, FirStatus status, String actor) {
        com.virtualpolice.vps.model.StatusLog log = new com.virtualpolice.vps.model.StatusLog();
        log.setFir(fir);
        log.setStatus(status);
        log.setUpdatedBy(actor);
        return log;
    }
}
