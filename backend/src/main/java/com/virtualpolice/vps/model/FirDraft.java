package com.virtualpolice.vps.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "fir_drafts")
public class FirDraft {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "citizen_id")
    private UserAccount citizen;

    @Column(nullable = false, length = 120)
    private String title = "";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description = "";

    @Column(length = 200)
    private String location;

    @Column(length = 12)
    private String aadhaarNumber;

    @Column(length = 10000)
    private String ocrExtractedText;

    @Column(length = 500)
    private String ocrKeywords;

    @Column(length = 60)
    private String suggestedCategory;

    @Column(length = 40)
    private String suggestedPriority;

    private Integer currentStep = 1;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void beforeUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public UserAccount getCitizen() {
        return citizen;
    }

    public void setCitizen(UserAccount citizen) {
        this.citizen = citizen;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title == null ? "" : title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description == null ? "" : description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getAadhaarNumber() {
        return aadhaarNumber;
    }

    public void setAadhaarNumber(String aadhaarNumber) {
        this.aadhaarNumber = aadhaarNumber;
    }

    public String getOcrExtractedText() {
        return ocrExtractedText;
    }

    public void setOcrExtractedText(String ocrExtractedText) {
        this.ocrExtractedText = ocrExtractedText;
    }

    public String getOcrKeywords() {
        return ocrKeywords;
    }

    public void setOcrKeywords(String ocrKeywords) {
        this.ocrKeywords = ocrKeywords;
    }

    public String getSuggestedCategory() {
        return suggestedCategory;
    }

    public void setSuggestedCategory(String suggestedCategory) {
        this.suggestedCategory = suggestedCategory;
    }

    public String getSuggestedPriority() {
        return suggestedPriority;
    }

    public void setSuggestedPriority(String suggestedPriority) {
        this.suggestedPriority = suggestedPriority;
    }

    public Integer getCurrentStep() {
        return currentStep;
    }

    public void setCurrentStep(Integer currentStep) {
        this.currentStep = currentStep;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
