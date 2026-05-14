package com.virtualpolice.vps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.virtualpolice.vps.repository.PoliceOfficerRepository;
import com.virtualpolice.vps.support.ApiErrorAssertions;
import com.virtualpolice.vps.support.TestAuthHelper;
import com.virtualpolice.vps.support.TestDataFactory;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("integration")
class AdminCommandIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PoliceOfficerRepository policeOfficerRepository;

    @Test
    void adminInterventionsShouldUpdateCommandDetail() throws Exception {
        String citizenToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen Admin", "citizen.admin@test.com", "909090909090", "CITIZEN");
        String adminToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Admin User", "admin.user@test.com", "909090909091", "ADMIN");
        TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Officer Admin", "officer.admin@test.com", "909090909092", "POLICE");

        Long officerId = policeOfficerRepository.findByUserEmail("officer.admin@test.com").orElseThrow().getId();

        String firResponse = mockMvc.perform(post("/api/citizen/fir")
                        .header("Authorization", "Bearer " + citizenToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.firCreatePayload("Admin Flow", "Fraud case", "Delhi", "909090909090", "fraud")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long firId = objectMapper.readTree(firResponse).get("id").asLong();

        String dueAt = LocalDateTime.now().plusDays(1).toString();

        mockMvc.perform(post("/api/admin/command/fir/" + firId + "/reassign")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.adminReassignPayload(officerId, "Central Station", "Reassign for load")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fir.assignedOfficerName").exists());

        mockMvc.perform(post("/api/admin/command/fir/" + firId + "/priority-override")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.adminPriorityOverridePayload("HIGH", "Escalated priority")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fir.priority").value("HIGH"));

        mockMvc.perform(post("/api/admin/command/fir/" + firId + "/escalate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.adminEscalatePayload("Immediate response", dueAt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fir.escalatedAt").exists());

        mockMvc.perform(post("/api/admin/command/fir/" + firId + "/request-update")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.adminRequestUpdatePayload("Provide update", dueAt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fir.adminRequestUpdateAt").exists());

        mockMvc.perform(post("/api/admin/command/fir/" + firId + "/reopen-review")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.adminReopenPayload("UNDER_REVIEW", "Reopen")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fir.status").value("UNDER_REVIEW"));

        mockMvc.perform(post("/api/admin/command/fir/" + firId + "/priority-override")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.adminPriorityOverridePayload("NOT_VALID", "Bad")))
                .andExpect(status().isBadRequest())
                .andExpect(ApiErrorAssertions.errorEnvelope("BAD_REQUEST"));
    }
}
