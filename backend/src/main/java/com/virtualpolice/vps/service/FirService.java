package com.virtualpolice.vps.service;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.*;
import com.virtualpolice.vps.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

@Service
public class FirService {
    private static final long MAX_EVIDENCE_FILE_SIZE_BYTES = 25 * 1024 * 1024L;
    private static final Set<String> ALLOWED_EVIDENCE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/rtf",
            "text/rtf",
            "application/vnd.oasis.opendocument.text"
    );
    private static final Set<String> ALLOWED_EVIDENCE_EXTENSIONS = Set.of(
            "jpg",
            "jpeg",
            "png",
            "pdf",
            "txt",
            "doc",
            "docx",
            "rtf",
            "odt"
    );

    private final FirReportRepository firReportRepository;
    private final FirDraftRepository firDraftRepository;
    private final UserRepository userRepository;
    private final PoliceOfficerRepository policeOfficerRepository;
    private final EvidenceRepository evidenceRepository;
    private final StatusLogRepository statusLogRepository;
    private final OcrService ocrService;
    private final CategorizationService categorizationService;
    private final GeoRoutingService geoRoutingService;
    private final NotificationService notificationService;

    public FirService(FirReportRepository firReportRepository,
                      FirDraftRepository firDraftRepository,
                      UserRepository userRepository,
                      PoliceOfficerRepository policeOfficerRepository,
                      EvidenceRepository evidenceRepository,
                      StatusLogRepository statusLogRepository,
                      OcrService ocrService,
                      CategorizationService categorizationService,
                      GeoRoutingService geoRoutingService,
                      NotificationService notificationService) {
        this.firReportRepository = firReportRepository;
        this.firDraftRepository = firDraftRepository;
        this.userRepository = userRepository;
        this.policeOfficerRepository = policeOfficerRepository;
        this.evidenceRepository = evidenceRepository;
        this.statusLogRepository = statusLogRepository;
        this.ocrService = ocrService;
        this.categorizationService = categorizationService;
        this.geoRoutingService = geoRoutingService;
        this.notificationService = notificationService;
    }

    public AuthDtos.OcrExtractResponse extractComplaintData(MultipartFile file) {
        String extractedText = ocrService.extractText(file);
        OcrService.ParsedOcrData parsed = ocrService.parseStructuredData(extractedText);
        CategorizationService.CategorizationResult analysis = categorizationService.analyze(extractedText);

        String suggestedDescription = ocrService.summarizeForDescription(extractedText);
        String suggestedTitle = ocrService.buildSuggestedTitle(parsed, analysis.category());

        return new AuthDtos.OcrExtractResponse(
                extractedText,
                parsed.name(),
                parsed.location(),
                parsed.keywords(),
                analysis.category(),
                analysis.priority(),
                suggestedTitle,
                suggestedDescription
        );
    }

    private UserAccount getCitizenByEmail(String citizenEmail) {
        return userRepository.findByEmail(citizenEmail)
                .orElseThrow(() -> new IllegalArgumentException("Citizen not found"));
    }

    private UserAccount getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private boolean isClosed(FirStatus status) {
        return status == FirStatus.CLOSED_CONFIRMED || status == FirStatus.CLOSED_AUTO_ACK;
    }

    @Transactional
    public AuthDtos.FirResponse createFir(String citizenEmail, AuthDtos.FirCreateRequest request) {
        UserAccount citizen = getCitizenByEmail(citizenEmail);

        if (!citizen.getAadhaarNumber().equals(request.aadhaarNumber())) {
            throw new IllegalStateException("Aadhaar does not match logged-in user");
        }

        String ocrText = request.ocrExtractedText() == null ? "" : request.ocrExtractedText().trim();
        OcrService.ParsedOcrData parsed = ocrService.parseStructuredData(ocrText);
        String combined = request.description() + " " + ocrText;
        CategorizationService.CategorizationResult analysis = categorizationService.analyze(combined);
        String resolvedLocation = (request.location() == null || request.location().isBlank())
                ? parsed.location()
                : request.location();
        String station = geoRoutingService.assignNearestStation(resolvedLocation);

        FirReport fir = new FirReport();
        fir.setCitizen(citizen);
        fir.setTitle(request.title());
        fir.setDescription(request.description());
        fir.setExtractedText(ocrText);
        fir.setCategory(analysis.category());
        fir.setPriority(analysis.priority());
        fir.setLocation(resolvedLocation);
        fir.setAssignedStation(station);
        fir.setExtractedName(parsed.name());
        fir.setExtractedLocation(parsed.location());
        fir.setExtractedCrimeKeywords(parsed.keywords());
        FirReport saved = firReportRepository.save(fir);

        saved.setDigitalSignatureHash(generateSignature(citizen.getAadhaarNumber(), saved.getId(), saved.getCreatedAt()));
        firReportRepository.save(saved);

        logStatus(saved, FirStatus.SUBMITTED, citizenEmail);
        notificationService.logEvent("FIR_SUBMITTED", "FIR #" + saved.getId() + " submitted by " + citizen.getEmail());
        return toResponse(saved);
    }

    public List<AuthDtos.FirResponse> getCitizenFirs(String email) {
        Long citizenId = userRepository.findByEmail(email).orElseThrow().getId();
        return firReportRepository.findByCitizenId(citizenId).stream().map(this::toResponse).toList();
    }

    public AuthDtos.FirResponse getCitizenFirDetail(String email, Long firId) {
        UserAccount citizen = getCitizenByEmail(email);
        FirReport fir = firReportRepository.findByIdAndCitizenId(firId, citizen.getId())
                .orElseThrow(() -> new IllegalArgumentException("FIR not found for current citizen"));
        return toResponse(fir);
    }

    @Transactional
    public AuthDtos.FirDraftResponse createDraft(String email, AuthDtos.FirDraftUpsertRequest request) {
        UserAccount citizen = getCitizenByEmail(email);
        FirDraft draft = new FirDraft();
        draft.setCitizen(citizen);
        applyDraftRequest(draft, request);
        FirDraft saved = firDraftRepository.save(draft);
        return toDraftResponse(saved);
    }

    public AuthDtos.FirDraftResponse getDraft(String email, Long id) {
        UserAccount citizen = getCitizenByEmail(email);
        FirDraft draft = firDraftRepository.findByIdAndCitizenId(id, citizen.getId())
                .orElseThrow(() -> new IllegalArgumentException("Draft not found"));
        return toDraftResponse(draft);
    }

    public AuthDtos.FirDraftResponse getLatestDraft(String email) {
        UserAccount citizen = getCitizenByEmail(email);
        FirDraft draft = firDraftRepository.findTopByCitizenIdOrderByUpdatedAtDesc(citizen.getId())
                .orElseThrow(() -> new IllegalArgumentException("No draft found"));
        return toDraftResponse(draft);
    }

    @Transactional
    public AuthDtos.FirDraftResponse updateDraft(String email, Long id, AuthDtos.FirDraftUpsertRequest request) {
        UserAccount citizen = getCitizenByEmail(email);
        FirDraft draft = firDraftRepository.findByIdAndCitizenId(id, citizen.getId())
                .orElseThrow(() -> new IllegalArgumentException("Draft not found"));
        applyDraftRequest(draft, request);
        FirDraft saved = firDraftRepository.save(draft);
        return toDraftResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AuthDtos.FirResponse> getAllFirs() {
        return firReportRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AuthDtos.FirResponse> getPoliceQueue(String status,
                                                     String station,
                                                     String assignee,
                                                     String priority,
                                                     String slaBucket) {
        LocalDateTime now = LocalDateTime.now();
        return firReportRepository.findAll().stream()
                .filter(fir -> matchesStatusFilter(fir, status))
                .filter(fir -> matchesContains(fir.getAssignedStation(), station))
                .filter(fir -> matchesContains(
                        fir.getAssignedOfficer() != null ? fir.getAssignedOfficer().getUser().getFullName() : null,
                        assignee
                ))
                .filter(fir -> matchesExact(fir.getPriority(), priority))
                .filter(fir -> matchesSlaBucket(fir, slaBucket, now))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AuthDtos.FirResponse getFirDetail(Long id) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        return toResponse(fir);
    }

    @Transactional
    public AuthDtos.FirResponse resolveFir(Long id, String officerEmail, AuthDtos.PoliceFirResolveRequest request) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        if (isClosed(fir.getStatus())) {
            throw new IllegalStateException("Closed FIR is read-only");
        }
        if (fir.getStatus() != FirStatus.INVESTIGATING) {
            throw new IllegalStateException("Only investigating FIR can be resolved");
        }
        if (!request.evidenceReviewed()) {
            throw new IllegalArgumentException("Checklist incomplete: evidence review is required");
        }

        String closureSummary = request.closureSummary() == null ? "" : request.closureSummary().trim();
        String citizenSummary = request.citizenSummary() == null ? "" : request.citizenSummary().trim();
        if (closureSummary.isBlank() || citizenSummary.isBlank()) {
            throw new IllegalArgumentException("Checklist incomplete: closure summary and citizen summary are required");
        }

        LocalDateTime now = LocalDateTime.now();
        fir.setClosureSummary(citizenSummary);
        fir.setOfficerNote(request.officerNote());
        fir.setEvidenceReviewedAt(now);
        fir.setResolvedAt(now);
        fir.setAcknowledgementDueAt(now.plusDays(7));
        fir.setAcknowledgedAt(null);
        fir.setDisputeReason(null);
        fir.setDisputedAt(null);
        fir.setDisputeResponseNote(closureSummary);
        fir.setDisputeRespondedAt(now);
        fir.setLastOfficerActionAt(now);
        fir.setStatus(FirStatus.AWAITING_CITIZEN_ACK);

        logStatus(fir, FirStatus.AWAITING_CITIZEN_ACK, officerEmail);
        notificationService.logEvent("FIR_STATUS_UPDATED",
                "FIR #" + fir.getId() + " moved to AWAITING_CITIZEN_ACK by " + officerEmail);
        return toResponse(firReportRepository.save(fir));
    }

    @Transactional
    public AuthDtos.FirResponse respondToDispute(Long id,
                                                 String officerEmail,
                                                 AuthDtos.PoliceDisputeResponseRequest request) {
        FirReport fir = firReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        if (isClosed(fir.getStatus())) {
            throw new IllegalStateException("Closed FIR is read-only");
        }
        if (fir.getStatus() != FirStatus.DISPUTED_REVIEW) {
            throw new IllegalStateException("FIR is not in disputed review");
        }
        enforceSameOfficerFirstPolicy(fir, officerEmail);

        FirStatus nextStatus = request.nextStatus();
        if (nextStatus != FirStatus.INVESTIGATING && nextStatus != FirStatus.AWAITING_CITIZEN_ACK) {
            throw new IllegalArgumentException("nextStatus must be INVESTIGATING or AWAITING_CITIZEN_ACK");
        }

        String responseNote = request.responseNote() == null ? "" : request.responseNote().trim();
        if (responseNote.isBlank()) {
            throw new IllegalArgumentException("Dispute response note is required");
        }

        LocalDateTime now = LocalDateTime.now();
        fir.setDisputeResponseNote(responseNote);
        fir.setDisputeRespondedAt(now);
        fir.setLastOfficerActionAt(now);
        if (request.officerNote() != null && !request.officerNote().isBlank()) {
            fir.setOfficerNote(request.officerNote());
        }
        if (request.evidenceReviewed()) {
            fir.setEvidenceReviewedAt(now);
        }

        if (nextStatus == FirStatus.AWAITING_CITIZEN_ACK) {
            String citizenSummary = request.citizenSummary() == null ? "" : request.citizenSummary().trim();
            if (citizenSummary.isBlank()) {
                throw new IllegalArgumentException("Citizen summary is required when resubmitting for acknowledgement");
            }
            if (!request.evidenceReviewed() && fir.getEvidenceReviewedAt() == null) {
                throw new IllegalArgumentException("Evidence review checklist is required before resubmission");
            }
            fir.setClosureSummary(citizenSummary);
            fir.setResolvedAt(now);
            fir.setAcknowledgementDueAt(now.plusDays(7));
            fir.setAcknowledgedAt(null);
            fir.setStatus(FirStatus.AWAITING_CITIZEN_ACK);
            logStatus(fir, FirStatus.AWAITING_CITIZEN_ACK, officerEmail);
        } else {
            fir.setStatus(FirStatus.INVESTIGATING);
            logStatus(fir, FirStatus.INVESTIGATING, officerEmail);
        }

        notificationService.logEvent("FIR_DISPUTE_RESPONSE",
                "Dispute response recorded for FIR #" + fir.getId() + " by " + officerEmail);
        return toResponse(firReportRepository.save(fir));
    }

    @Transactional
    public AuthDtos.FirResponse updateFir(Long id, String officerEmail, AuthDtos.FirUpdateRequest request) {
        FirReport fir = firReportRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        if (isClosed(fir.getStatus())) {
            throw new IllegalStateException("Closed FIR is read-only");
        }

        if (request.category() != null) {
            fir.setCategory(request.category());
        }
        if (request.priority() != null) {
            fir.setPriority(request.priority());
        }
        if (request.assignedOfficerId() != null) {
            PoliceOfficer officer = policeOfficerRepository.findById(request.assignedOfficerId())
                    .orElseThrow(() -> new IllegalArgumentException("Officer not found"));
            fir.setAssignedOfficer(officer);
        }
        if (request.status() != null) {
            FirStatus nextStatus = request.status();
            if (nextStatus == FirStatus.RESOLVED
                    || nextStatus == FirStatus.AWAITING_CITIZEN_ACK
                    || nextStatus == FirStatus.DISPUTED_REVIEW
                    || nextStatus == FirStatus.CLOSED_CONFIRMED
                    || nextStatus == FirStatus.CLOSED_AUTO_ACK) {
                throw new IllegalStateException("Use workflow action endpoints for this transition");
            }
            fir.setStatus(nextStatus);
            logStatus(fir, nextStatus, officerEmail);
            notificationService.logEvent("FIR_STATUS_UPDATED", "FIR #" + fir.getId() + " moved to " + nextStatus);
        }
        fir.setLastOfficerActionAt(LocalDateTime.now());

        return toResponse(firReportRepository.save(fir));
    }

    @Transactional
    public void uploadEvidence(Long firId, MultipartFile file) {
        FirReport fir = firReportRepository.findById(firId)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));
        uploadEvidenceToFir(fir, file);
    }

    @Transactional
    public void uploadEvidence(String email, Long firId, MultipartFile file) {
        UserAccount citizen = getCitizenByEmail(email);
        FirReport fir = firReportRepository.findByIdAndCitizenId(firId, citizen.getId())
                .orElseThrow(() -> new IllegalArgumentException("FIR not found for current citizen"));
        uploadEvidenceToFir(fir, file);
    }

    private void uploadEvidenceToFir(FirReport fir, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to upload");
        }
        if (file.getSize() > MAX_EVIDENCE_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File too large. Maximum allowed size is 25 MB");
        }
        validateEvidenceFileType(file);

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "evidence";
        String fileType = file.getContentType()      != null ? file.getContentType()      : "application/octet-stream";
        long   sizeKb   = file.getSize() / 1024;

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Failed to read uploaded file", e);
        }

        EvidenceFile evidence = new EvidenceFile();
        evidence.setFir(fir);
        evidence.setFileName(fileName);
        evidence.setFileType(fileType);
        evidence.setStoragePath("db://evidence/" + fir.getId() + "/" + fileName);
        evidence.setFileData(fileBytes);
        evidenceRepository.save(evidence);

        notificationService.logEvent("EVIDENCE_UPLOADED",
                "Evidence '" + fileName + "' (" + sizeKb + " KB) uploaded for FIR #" + fir.getId());
    }

    private void validateEvidenceFileType(MultipartFile file) {
        String contentType = normalize(file.getContentType());
        String fileName = normalize(file.getOriginalFilename());
        if (!ALLOWED_EVIDENCE_CONTENT_TYPES.contains(contentType) && !hasAllowedEvidenceExtension(fileName)) {
            throw new IllegalArgumentException("Unsupported evidence type. Use JPG, PNG, PDF, TXT, DOC, DOCX, RTF, or ODT");
        }
    }

    private boolean hasAllowedEvidenceExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return false;
        }
        String extension = fileName.substring(dotIndex + 1).toLowerCase();
        return ALLOWED_EVIDENCE_EXTENSIONS.contains(extension);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }


    public List<AuthDtos.EvidenceMetaResponse> getEvidenceForFir(Long firId) {
        return evidenceRepository.findByFirId(firId).stream()
                .map(e -> new AuthDtos.EvidenceMetaResponse(
                        e.getId(),
                        e.getFileName(),
                        e.getFileType(),
                        e.getFileData() != null ? e.getFileData().length : 0L,
                        e.getUploadedAt()
                ))
                .toList();
    }

    public EvidenceFile getEvidenceFile(Long evidenceId) {
        return evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new IllegalArgumentException("Evidence not found"));
    }

    public List<AuthDtos.StatusLogResponse> getTimeline(Long firId) {
        return statusLogRepository.findByFirIdOrderByUpdatedAtAsc(firId)
                .stream()
                .map(log -> new AuthDtos.StatusLogResponse(log.getStatus(), log.getUpdatedBy(), log.getUpdatedAt()))
                .toList();
    }

    public List<AuthDtos.StatusLogResponse> getCitizenTimeline(String email, Long firId) {
        UserAccount citizen = getCitizenByEmail(email);
        boolean exists = firReportRepository.findByIdAndCitizenId(firId, citizen.getId()).isPresent();
        if (!exists) {
            throw new IllegalArgumentException("FIR not found for current citizen");
        }
        return getTimeline(firId);
    }

    @Transactional
    public AuthDtos.FirResponse acknowledgeResolution(String email, Long firId) {
        UserAccount citizen = getCitizenByEmail(email);
        FirReport fir = firReportRepository.findByIdAndCitizenId(firId, citizen.getId())
                .orElseThrow(() -> new IllegalArgumentException("FIR not found for current citizen"));
        if (fir.getStatus() != FirStatus.AWAITING_CITIZEN_ACK) {
            throw new IllegalStateException("This FIR is not awaiting citizen acknowledgement");
        }
        fir.setStatus(FirStatus.CLOSED_CONFIRMED);
        fir.setAcknowledgedAt(LocalDateTime.now());
        logStatus(fir, FirStatus.CLOSED_CONFIRMED, email);
        notificationService.logEvent("FIR_CLOSED_CONFIRMED", "Citizen confirmed resolution for FIR #" + fir.getId());
        return toResponse(firReportRepository.save(fir));
    }

    @Transactional
    public AuthDtos.FirResponse disputeResolution(String email, Long firId, String reason) {
        UserAccount citizen = getCitizenByEmail(email);
        FirReport fir = firReportRepository.findByIdAndCitizenId(firId, citizen.getId())
                .orElseThrow(() -> new IllegalArgumentException("FIR not found for current citizen"));
        if (fir.getStatus() != FirStatus.AWAITING_CITIZEN_ACK) {
            throw new IllegalStateException("This FIR is not awaiting citizen acknowledgement");
        }
        String trimmedReason = reason == null ? "" : reason.trim();
        if (trimmedReason.isBlank()) {
            throw new IllegalArgumentException("Dispute reason is required");
        }
        fir.setStatus(FirStatus.DISPUTED_REVIEW);
        fir.setDisputeReason(trimmedReason);
        fir.setDisputedAt(LocalDateTime.now());
        fir.setAcknowledgedAt(LocalDateTime.now());
        fir.setDisputeResponseNote(null);
        fir.setDisputeRespondedAt(null);
        logStatus(fir, FirStatus.DISPUTED_REVIEW, email);
        notificationService.logEvent("FIR_DISPUTED",
                "Citizen disputed resolution for FIR #" + fir.getId() + " reason: " + trimmedReason);
        return toResponse(firReportRepository.save(fir));
    }

    @Transactional
    public int autoCloseExpiredAcknowledgements() {
        List<FirReport> pending = firReportRepository.findByStatusAndAcknowledgementDueAtBefore(
                FirStatus.AWAITING_CITIZEN_ACK,
                LocalDateTime.now()
        );
        for (FirReport fir : pending) {
            fir.setStatus(FirStatus.CLOSED_AUTO_ACK);
            fir.setAcknowledgedAt(LocalDateTime.now());
            logStatus(fir, FirStatus.CLOSED_AUTO_ACK, "SYSTEM_AUTO_CLOSE");
            notificationService.logEvent("FIR_CLOSED_AUTO_ACK",
                    "FIR #" + fir.getId() + " auto-closed after acknowledgement SLA");
        }
        firReportRepository.saveAll(pending);
        return pending.size();
    }

    private void enforceSameOfficerFirstPolicy(FirReport fir, String officerEmail) {
        if (fir.getAssignedOfficer() == null) {
            return;
        }
        PoliceOfficer actorOfficer = policeOfficerRepository.findByUserEmail(officerEmail).orElse(null);
        if (actorOfficer == null) {
            return; // admin/support user under police route
        }
        if (!fir.getAssignedOfficer().getId().equals(actorOfficer.getId())) {
            throw new IllegalStateException("Disputed case must be handled first by the assigned officer");
        }
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

    private boolean matchesStatusFilter(FirReport fir, String status) {
        if (status == null || status.isBlank()) {
            return true;
        }
        return fir.getStatus().name().equalsIgnoreCase(status.trim());
    }

    private boolean matchesSlaBucket(FirReport fir, String slaBucket, LocalDateTime now) {
        if (slaBucket == null || slaBucket.isBlank()) {
            return true;
        }
        if (fir.getStatus() != FirStatus.AWAITING_CITIZEN_ACK || fir.getAcknowledgementDueAt() == null) {
            return "NO_SLA".equalsIgnoreCase(slaBucket.trim());
        }
        long hours = ChronoUnit.HOURS.between(now, fir.getAcknowledgementDueAt());
        return switch (slaBucket.trim().toUpperCase()) {
            case "OVERDUE" -> hours < 0;
            case "DUE_24H" -> hours >= 0 && hours <= 24;
            case "DUE_3D" -> hours > 24 && hours <= 72;
            case "OPEN" -> hours > 72;
            default -> true;
        };
    }

    private void logStatus(FirReport fir, FirStatus status, String actor) {
        StatusLog log = new StatusLog();
        log.setFir(fir);
        log.setStatus(status);
        log.setUpdatedBy(actor);
        statusLogRepository.save(log);
    }

    private String generateSignature(String aadhaar, Long firId, LocalDateTime timestamp) {
        String input = aadhaar + firId + timestamp;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to generate signature", e);
        }
    }

    private void applyDraftRequest(FirDraft draft, AuthDtos.FirDraftUpsertRequest request) {
        draft.setTitle(request.title());
        draft.setDescription(request.description());
        draft.setLocation(request.location());
        draft.setAadhaarNumber(request.aadhaarNumber());
        draft.setOcrExtractedText(request.ocrExtractedText());
        draft.setOcrKeywords(request.ocrKeywords());
        draft.setSuggestedCategory(request.suggestedCategory());
        draft.setSuggestedPriority(request.suggestedPriority());
        draft.setCurrentStep(request.currentStep() == null ? 1 : request.currentStep());
    }

    private AuthDtos.FirDraftResponse toDraftResponse(FirDraft draft) {
        return new AuthDtos.FirDraftResponse(
                draft.getId(),
                draft.getTitle(),
                draft.getDescription(),
                draft.getLocation(),
                draft.getAadhaarNumber(),
                draft.getOcrExtractedText(),
                draft.getOcrKeywords(),
                draft.getSuggestedCategory(),
                draft.getSuggestedPriority(),
                draft.getCurrentStep(),
                draft.getCreatedAt(),
                draft.getUpdatedAt()
        );
    }

    private AuthDtos.FirResponse toResponse(FirReport fir) {
        String citizenName = fir.getCitizen() != null && fir.getCitizen().getFullName() != null
                ? fir.getCitizen().getFullName()
                : "Unknown Citizen";
        String assignedOfficerName = null;
        if (fir.getAssignedOfficer() != null
                && fir.getAssignedOfficer().getUser() != null
                && fir.getAssignedOfficer().getUser().getFullName() != null) {
            assignedOfficerName = fir.getAssignedOfficer().getUser().getFullName();
        }

        return new AuthDtos.FirResponse(
                fir.getId(),
                fir.getTitle(),
                fir.getDescription(),
                fir.getCategory(),
                fir.getStatus(),
                fir.getPriority(),
                fir.getLocation(),
                fir.getAssignedStation(),
                fir.getExtractedName(),
                fir.getExtractedLocation(),
                fir.getExtractedCrimeKeywords(),
                fir.getExtractedText(),
                fir.getDigitalSignatureHash(),
                citizenName,
                assignedOfficerName,
                fir.getResolvedAt(),
                fir.getAcknowledgementDueAt(),
                fir.getAcknowledgedAt(),
                fir.getDisputeReason(),
                fir.getClosureSummary(),
                fir.getOfficerNote(),
                fir.getEvidenceReviewedAt(),
                fir.getDisputedAt(),
                fir.getDisputeResponseNote(),
                fir.getDisputeRespondedAt(),
                fir.getLastOfficerActionAt(),
                fir.getEscalatedAt(),
                fir.getEscalatedBy(),
                fir.getEscalationReason(),
                fir.getEscalationDueAt(),
                fir.getAdminRequestUpdateMessage(),
                fir.getAdminRequestUpdateDueAt(),
                fir.getAdminRequestUpdateAt(),
                fir.getAdminRequestUpdateBy(),
                fir.getLastAdminActionAt(),
                fir.getPriorityOverrideReason(),
                fir.getCreatedAt(),
                getEvidenceForFir(fir.getId()),
                getTimeline(fir.getId())
        );
    }
}
