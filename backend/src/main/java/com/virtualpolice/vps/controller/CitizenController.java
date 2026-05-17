package com.virtualpolice.vps.controller;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.EvidenceFile;
import com.virtualpolice.vps.service.FirService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/citizen")
public class CitizenController {
    private final FirService firService;

    public CitizenController(FirService firService) {
        this.firService = firService;
    }

    @PostMapping("/fir")
    public AuthDtos.FirResponse createFir(Authentication auth, @Valid @RequestBody AuthDtos.FirCreateRequest request) {
        return firService.createFir(auth.getName(), request);
    }

    @PostMapping(value = "/ocr/extract", consumes = "multipart/form-data")
    public AuthDtos.OcrExtractResponse extractOcr(@RequestPart("file") MultipartFile file) {
        return firService.extractComplaintData(file);
    }

    @GetMapping("/fir")
    public List<AuthDtos.FirResponse> myFirs(Authentication auth) {
        return firService.getCitizenFirs(auth.getName());
    }

    @PostMapping(value = "/fir/{id}/evidence", consumes = "multipart/form-data")
    public void uploadEvidence(Authentication auth,
                               @PathVariable Long id,
                               @RequestPart("file") MultipartFile file) {
        firService.uploadEvidence(auth.getName(), id, file);
    }

    @GetMapping("/fir/{id}/timeline")
    public List<AuthDtos.StatusLogResponse> timeline(Authentication auth, @PathVariable Long id) {
        return firService.getCitizenTimeline(auth.getName(), id);
    }

    @GetMapping("/fir/{id}")
    public AuthDtos.FirResponse firDetail(Authentication auth, @PathVariable Long id) {
        return firService.getCitizenFirDetail(auth.getName(), id);
    }

    @GetMapping("/evidence/{evidenceId}/download")
    public ResponseEntity<byte[]> downloadEvidence(Authentication auth, @PathVariable Long evidenceId) {
        EvidenceFile ev = firService.getCitizenEvidenceFile(auth.getName(), evidenceId);
        byte[] data = ev.getFileData();
        if (data == null || data.length == 0) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + ev.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(ev.getFileType() != null ? ev.getFileType() : "application/octet-stream"))
                .body(data);
    }

    @PostMapping("/fir/draft")
    public AuthDtos.FirDraftResponse createDraft(Authentication auth,
                                                 @Valid @RequestBody AuthDtos.FirDraftUpsertRequest request) {
        return firService.createDraft(auth.getName(), request);
    }

    @GetMapping("/fir/draft/{id}")
    public AuthDtos.FirDraftResponse getDraft(Authentication auth, @PathVariable Long id) {
        return firService.getDraft(auth.getName(), id);
    }

    @GetMapping("/fir/draft/latest")
    public AuthDtos.FirDraftResponse getLatestDraft(Authentication auth) {
        return firService.getLatestDraft(auth.getName());
    }

    @PatchMapping("/fir/draft/{id}")
    public AuthDtos.FirDraftResponse updateDraft(Authentication auth,
                                                 @PathVariable Long id,
                                                 @Valid @RequestBody AuthDtos.FirDraftUpsertRequest request) {
        return firService.updateDraft(auth.getName(), id, request);
    }

    @PostMapping("/fir/{id}/acknowledge")
    public AuthDtos.FirResponse acknowledgeResolution(Authentication auth, @PathVariable Long id) {
        return firService.acknowledgeResolution(auth.getName(), id);
    }

    @PostMapping("/fir/{id}/dispute")
    public AuthDtos.FirResponse disputeResolution(Authentication auth,
                                                  @PathVariable Long id,
                                                  @Valid @RequestBody AuthDtos.ResolutionDisputeRequest request) {
        return firService.disputeResolution(auth.getName(), id, request.reason());
    }
}
