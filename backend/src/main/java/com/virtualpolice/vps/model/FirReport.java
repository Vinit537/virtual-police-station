package com.virtualpolice.vps.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "fir_reports")
public class FirReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "citizen_id")
    private UserAccount citizen;

    @ManyToOne
    @JoinColumn(name = "assigned_officer_id")
    private PoliceOfficer assignedOfficer;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FirStatus status = FirStatus.SUBMITTED;

    @Column(nullable = false)
    private String priority = "MEDIUM";

    private String location;

    private String assignedStation;

    private String extractedName;

    private String extractedLocation;

    private String extractedCrimeKeywords;

    @Column(columnDefinition = "TEXT")
    private String extractedText;

    private String digitalSignatureHash;

    private LocalDateTime resolvedAt;

    private LocalDateTime acknowledgementDueAt;

    private LocalDateTime acknowledgedAt;

    @Column(columnDefinition = "TEXT")
    private String disputeReason;

    @Column(columnDefinition = "TEXT")
    private String closureSummary;

    @Column(columnDefinition = "TEXT")
    private String officerNote;

    private LocalDateTime evidenceReviewedAt;

    private LocalDateTime disputedAt;

    @Column(columnDefinition = "TEXT")
    private String disputeResponseNote;

    private LocalDateTime disputeRespondedAt;

    private LocalDateTime lastOfficerActionAt;

    private LocalDateTime escalatedAt;

    private String escalatedBy;

    @Column(columnDefinition = "TEXT")
    private String escalationReason;

    private LocalDateTime escalationDueAt;

    @Column(columnDefinition = "TEXT")
    private String adminRequestUpdateMessage;

    private LocalDateTime adminRequestUpdateDueAt;

    private LocalDateTime adminRequestUpdateAt;

    private String adminRequestUpdateBy;

    private LocalDateTime lastAdminActionAt;

    @Column(columnDefinition = "TEXT")
    private String priorityOverrideReason;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Version
    private Long version;

    public Long getId() {
        return id;
    }

    public UserAccount getCitizen() {
        return citizen;
    }

    public void setCitizen(UserAccount citizen) {
        this.citizen = citizen;
    }

    public PoliceOfficer getAssignedOfficer() {
        return assignedOfficer;
    }

    public void setAssignedOfficer(PoliceOfficer assignedOfficer) {
        this.assignedOfficer = assignedOfficer;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public FirStatus getStatus() {
        return status;
    }

    public void setStatus(FirStatus status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getExtractedText() {
        return extractedText;
    }

    public void setExtractedText(String extractedText) {
        this.extractedText = extractedText;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getAssignedStation() {
        return assignedStation;
    }

    public void setAssignedStation(String assignedStation) {
        this.assignedStation = assignedStation;
    }

    public String getExtractedName() {
        return extractedName;
    }

    public void setExtractedName(String extractedName) {
        this.extractedName = extractedName;
    }

    public String getExtractedLocation() {
        return extractedLocation;
    }

    public void setExtractedLocation(String extractedLocation) {
        this.extractedLocation = extractedLocation;
    }

    public String getExtractedCrimeKeywords() {
        return extractedCrimeKeywords;
    }

    public void setExtractedCrimeKeywords(String extractedCrimeKeywords) {
        this.extractedCrimeKeywords = extractedCrimeKeywords;
    }

    public String getDigitalSignatureHash() {
        return digitalSignatureHash;
    }

    public void setDigitalSignatureHash(String digitalSignatureHash) {
        this.digitalSignatureHash = digitalSignatureHash;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public LocalDateTime getAcknowledgementDueAt() {
        return acknowledgementDueAt;
    }

    public void setAcknowledgementDueAt(LocalDateTime acknowledgementDueAt) {
        this.acknowledgementDueAt = acknowledgementDueAt;
    }

    public LocalDateTime getAcknowledgedAt() {
        return acknowledgedAt;
    }

    public void setAcknowledgedAt(LocalDateTime acknowledgedAt) {
        this.acknowledgedAt = acknowledgedAt;
    }

    public String getDisputeReason() {
        return disputeReason;
    }

    public void setDisputeReason(String disputeReason) {
        this.disputeReason = disputeReason;
    }

    public String getClosureSummary() {
        return closureSummary;
    }

    public void setClosureSummary(String closureSummary) {
        this.closureSummary = closureSummary;
    }

    public String getOfficerNote() {
        return officerNote;
    }

    public void setOfficerNote(String officerNote) {
        this.officerNote = officerNote;
    }

    public LocalDateTime getEvidenceReviewedAt() {
        return evidenceReviewedAt;
    }

    public void setEvidenceReviewedAt(LocalDateTime evidenceReviewedAt) {
        this.evidenceReviewedAt = evidenceReviewedAt;
    }

    public LocalDateTime getDisputedAt() {
        return disputedAt;
    }

    public void setDisputedAt(LocalDateTime disputedAt) {
        this.disputedAt = disputedAt;
    }

    public String getDisputeResponseNote() {
        return disputeResponseNote;
    }

    public void setDisputeResponseNote(String disputeResponseNote) {
        this.disputeResponseNote = disputeResponseNote;
    }

    public LocalDateTime getDisputeRespondedAt() {
        return disputeRespondedAt;
    }

    public void setDisputeRespondedAt(LocalDateTime disputeRespondedAt) {
        this.disputeRespondedAt = disputeRespondedAt;
    }

    public LocalDateTime getLastOfficerActionAt() {
        return lastOfficerActionAt;
    }

    public void setLastOfficerActionAt(LocalDateTime lastOfficerActionAt) {
        this.lastOfficerActionAt = lastOfficerActionAt;
    }

    public LocalDateTime getEscalatedAt() {
        return escalatedAt;
    }

    public void setEscalatedAt(LocalDateTime escalatedAt) {
        this.escalatedAt = escalatedAt;
    }

    public String getEscalatedBy() {
        return escalatedBy;
    }

    public void setEscalatedBy(String escalatedBy) {
        this.escalatedBy = escalatedBy;
    }

    public String getEscalationReason() {
        return escalationReason;
    }

    public void setEscalationReason(String escalationReason) {
        this.escalationReason = escalationReason;
    }

    public LocalDateTime getEscalationDueAt() {
        return escalationDueAt;
    }

    public void setEscalationDueAt(LocalDateTime escalationDueAt) {
        this.escalationDueAt = escalationDueAt;
    }

    public String getAdminRequestUpdateMessage() {
        return adminRequestUpdateMessage;
    }

    public void setAdminRequestUpdateMessage(String adminRequestUpdateMessage) {
        this.adminRequestUpdateMessage = adminRequestUpdateMessage;
    }

    public LocalDateTime getAdminRequestUpdateDueAt() {
        return adminRequestUpdateDueAt;
    }

    public void setAdminRequestUpdateDueAt(LocalDateTime adminRequestUpdateDueAt) {
        this.adminRequestUpdateDueAt = adminRequestUpdateDueAt;
    }

    public LocalDateTime getAdminRequestUpdateAt() {
        return adminRequestUpdateAt;
    }

    public void setAdminRequestUpdateAt(LocalDateTime adminRequestUpdateAt) {
        this.adminRequestUpdateAt = adminRequestUpdateAt;
    }

    public String getAdminRequestUpdateBy() {
        return adminRequestUpdateBy;
    }

    public void setAdminRequestUpdateBy(String adminRequestUpdateBy) {
        this.adminRequestUpdateBy = adminRequestUpdateBy;
    }

    public LocalDateTime getLastAdminActionAt() {
        return lastAdminActionAt;
    }

    public void setLastAdminActionAt(LocalDateTime lastAdminActionAt) {
        this.lastAdminActionAt = lastAdminActionAt;
    }

    public String getPriorityOverrideReason() {
        return priorityOverrideReason;
    }

    public void setPriorityOverrideReason(String priorityOverrideReason) {
        this.priorityOverrideReason = priorityOverrideReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Long getVersion() {
        return version;
    }
}
