package com.virtualpolice.vps.controller;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.EvidenceFile;
import com.virtualpolice.vps.service.FirService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/police")
public class PoliceController {
    private final FirService firService;

    public PoliceController(FirService firService) {
        this.firService = firService;
    }

    @GetMapping("/fir")
    public List<AuthDtos.FirResponse> allFirs() {
        return firService.getAllFirs();
    }

    @GetMapping("/fir/queue")
    public List<AuthDtos.FirResponse> queue(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String station,
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String slaBucket
    ) {
        return firService.getPoliceQueue(status, station, assignee, priority, slaBucket);
    }

    @GetMapping("/fir/{id}")
    public AuthDtos.FirResponse detail(@PathVariable Long id) {
        return firService.getFirDetail(id);
    }

    @PatchMapping("/fir/{id}")
    public AuthDtos.FirResponse updateFir(@PathVariable Long id,
                                          Authentication auth,
                                          @Valid @RequestBody AuthDtos.FirUpdateRequest request) {
        return firService.updateFir(id, auth.getName(), request);
    }

    @PostMapping("/fir/{id}/resolve")
    public AuthDtos.FirResponse resolveFir(@PathVariable Long id,
                                           Authentication auth,
                                           @Valid @RequestBody AuthDtos.PoliceFirResolveRequest request) {
        return firService.resolveFir(id, auth.getName(), request);
    }

    @PostMapping("/fir/{id}/dispute/respond")
    public AuthDtos.FirResponse respondToDispute(@PathVariable Long id,
                                                 Authentication auth,
                                                 @Valid @RequestBody AuthDtos.PoliceDisputeResponseRequest request) {
        return firService.respondToDispute(id, auth.getName(), request);
    }

    /** List all evidence files (metadata only) attached to a FIR */
    @GetMapping("/fir/{id}/evidence")
    public List<AuthDtos.EvidenceMetaResponse> listEvidence(@PathVariable Long id) {
        return firService.getEvidenceForFir(id);
    }

    /** Download the actual file bytes for a specific evidence record */
    @GetMapping("/evidence/{evidenceId}/download")
    public ResponseEntity<byte[]> downloadEvidence(@PathVariable Long evidenceId) {
        EvidenceFile ev = firService.getEvidenceFile(evidenceId);
        byte[] data = ev.getFileData();
        if (data == null || data.length == 0) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + ev.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(
                        ev.getFileType() != null ? ev.getFileType() : "application/octet-stream"))
                .body(data);
    }
}
