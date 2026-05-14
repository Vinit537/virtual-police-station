package com.virtualpolice.vps.controller;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.repository.PoliceOfficerRepository;
import com.virtualpolice.vps.repository.UserRepository;
import com.virtualpolice.vps.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;
    private final UserRepository userRepository;
    private final PoliceOfficerRepository officerRepository;

    public AdminController(AdminService adminService,
                           UserRepository userRepository,
                           PoliceOfficerRepository officerRepository) {
        this.adminService = adminService;
        this.userRepository = userRepository;
        this.officerRepository = officerRepository;
    }

    @GetMapping("/stats")
    public AuthDtos.DashboardStats stats() {
        return adminService.stats();
    }

    @GetMapping("/analytics")
    public AuthDtos.AdminAnalytics analytics() {
        return adminService.analytics();
    }

    @GetMapping("/users")
    public Object users() {
        return userRepository.findAll();
    }

    @GetMapping("/officers")
    public Object officers() {
        return officerRepository.findAll();
    }

    @GetMapping("/activity")
    public Object activityHealth() {
        return Map.of("status", "ok", "message", "System activity stream available");
    }

    @GetMapping("/crime-trend")
    public Object crimeTrend() {
        return adminService.crimeTrend();
    }

    @GetMapping("/events")
    public Object events() {
        return adminService.recentEvents();
    }

    @GetMapping("/command/queue")
    public List<AuthDtos.AdminCommandQueueItem> commandQueue(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String station,
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String slaBucket,
            @RequestParam(required = false) Boolean escalated
    ) {
        return adminService.getCommandQueue(preset, status, priority, station, assignee, slaBucket, escalated);
    }

    @GetMapping("/command/fir/{id}")
    public AuthDtos.AdminCommandDetailResponse commandFirDetail(@PathVariable Long id) {
        return adminService.getCommandDetail(id);
    }

    @PostMapping("/command/fir/{id}/reassign")
    public AuthDtos.AdminCommandDetailResponse reassign(@PathVariable Long id,
                                                        Authentication auth,
                                                        @Valid @RequestBody AuthDtos.AdminReassignRequest request) {
        return adminService.reassignCase(id, auth.getName(), request);
    }

    @PostMapping("/command/fir/{id}/priority-override")
    public AuthDtos.AdminCommandDetailResponse priorityOverride(@PathVariable Long id,
                                                                Authentication auth,
                                                                @Valid @RequestBody AuthDtos.AdminPriorityOverrideRequest request) {
        return adminService.priorityOverride(id, auth.getName(), request);
    }

    @PostMapping("/command/fir/{id}/escalate")
    public AuthDtos.AdminCommandDetailResponse escalate(@PathVariable Long id,
                                                        Authentication auth,
                                                        @Valid @RequestBody AuthDtos.AdminEscalateRequest request) {
        return adminService.escalate(id, auth.getName(), request);
    }

    @PostMapping("/command/fir/{id}/request-update")
    public AuthDtos.AdminCommandDetailResponse requestUpdate(@PathVariable Long id,
                                                             Authentication auth,
                                                             @Valid @RequestBody AuthDtos.AdminRequestUpdateRequest request) {
        return adminService.requestPoliceUpdate(id, auth.getName(), request);
    }

    @PostMapping("/command/fir/{id}/reopen-review")
    public AuthDtos.AdminCommandDetailResponse reopenReview(@PathVariable Long id,
                                                            Authentication auth,
                                                            @Valid @RequestBody AuthDtos.AdminReopenReviewRequest request) {
        return adminService.reopenForReview(id, auth.getName(), request);
    }

    @PostMapping("/purge-non-admin-users")
    public Object purgeNonAdminUsers() {
        long deletedUsers = adminService.purgePoliceAndCitizenUsers();
        return Map.of("deletedUsers", deletedUsers, "message", "Police and citizen users deleted");
    }
}
