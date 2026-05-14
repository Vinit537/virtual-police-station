package com.virtualpolice.vps.controller;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.service.CaseWorkflowService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/cases")
public class CaseWorkflowController {
    private final CaseWorkflowService caseWorkflowService;

    public CaseWorkflowController(CaseWorkflowService caseWorkflowService) {
        this.caseWorkflowService = caseWorkflowService;
    }

    @GetMapping("/queue")
    public List<AuthDtos.CaseQueueItemDto> queue(Authentication auth,
                                                 @RequestParam(required = false) String status,
                                                 @RequestParam(required = false) String station,
                                                 @RequestParam(required = false) String assignee,
                                                 @RequestParam(required = false) String priority,
                                                 @RequestParam(required = false) String slaBucket) {
        return caseWorkflowService.getQueue(auth.getName(), status, station, assignee, priority, slaBucket);
    }

    @GetMapping("/{id}")
    public AuthDtos.CaseDetailResponseDto detail(Authentication auth, @PathVariable Long id) {
        return caseWorkflowService.getCaseDetail(auth.getName(), id);
    }

    @PostMapping("/{id}/actions/{actionType}")
    public AuthDtos.CaseDetailResponseDto action(Authentication auth,
                                                 @PathVariable Long id,
                                                 @PathVariable String actionType,
                                                 @RequestBody(required = false) AuthDtos.CaseActionRequestDto request) {
        AuthDtos.CaseActionRequestDto payload = request == null
                ? new AuthDtos.CaseActionRequestDto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, false, null, null)
                : request;
        return caseWorkflowService.applyAction(auth.getName(), id, actionType, payload);
    }
}
