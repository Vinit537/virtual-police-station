package com.virtualpolice.vps.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "evidence_files")
public class EvidenceFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "fir_id")
    private FirReport fir;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String fileType;

    @Column(nullable = false)
    private String storagePath;

    @Lob
    @Column(columnDefinition = "BLOB")
    private byte[] fileData;

    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();


    public Long getId() {
        return id;
    }

    public FirReport getFir() {
        return fir;
    }

    public void setFir(FirReport fir) {
        this.fir = fir;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public void setStoragePath(String storagePath) {
        this.storagePath = storagePath;
    }

    public byte[] getFileData() {
        return fileData;
    }

    public void setFileData(byte[] fileData) {
        this.fileData = fileData;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }
}
