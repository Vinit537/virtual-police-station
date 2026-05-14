package com.virtualpolice.vps;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("integration")
class PoliceWorkflowIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private com.virtualpolice.vps.repository.PoliceOfficerRepository policeOfficerRepository;

    @Test
    void resolveChecklistAndDisputeOwnershipShouldBeEnforced() throws Exception {
                String citizenToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen Queue", "citizen.queue@test.com", "333344445550", "CITIZEN");
                String officerOneToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Officer One", "officer.one2@test.com", "333344445551", "POLICE");
                String officerTwoToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Officer Two", "officer.two2@test.com", "333344445552", "POLICE");
        Long officerOneId = policeOfficerRepository
                .findByUserEmail("officer.one2@test.com")
                .orElseThrow()
                .getId();

        String firPayload = TestDataFactory.firCreatePayload(
                "Mobile snatching",
                "Phone snatched near bus stand",
                "Indore",
                "333344445550",
                "snatching"
        );

        String firResponse = mockMvc.perform(post("/api/citizen/fir")
                        .header("Authorization", "Bearer " + citizenToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firPayload))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long firId = objectMapper.readTree(firResponse).get("id").asLong();

        mockMvc.perform(patch("/api/police/fir/" + firId)
                        .header("Authorization", "Bearer " + officerOneToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_REVIEW\",\"assignedOfficerId\":" + officerOneId + "}"))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/police/fir/" + firId)
                        .header("Authorization", "Bearer " + officerOneToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INVESTIGATING\"}"))
                .andExpect(status().isOk());

                                mockMvc.perform(post("/api/police/fir/" + firId + "/resolve")
                                                                                                .header("Authorization", "Bearer " + officerOneToken)
                                                                                                .contentType(MediaType.APPLICATION_JSON)
                                                                                                .content(TestDataFactory.resolvePayload(false)))
                .andExpect(status().isBadRequest())
                                        .andExpect(ApiErrorAssertions.errorEnvelope("BAD_REQUEST"));

                                mockMvc.perform(post("/api/police/fir/" + firId + "/resolve")
                                                                                                .header("Authorization", "Bearer " + officerOneToken)
                                                                                                .contentType(MediaType.APPLICATION_JSON)
                                                                                                .content(TestDataFactory.resolvePayload(true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AWAITING_CITIZEN_ACK"))
                .andExpect(jsonPath("$.closureSummary").value("Case resolved and evidence verified"))
                .andExpect(jsonPath("$.evidenceReviewedAt").exists());

        mockMvc.perform(post("/api/citizen/fir/" + firId + "/dispute")
                        .header("Authorization", "Bearer " + citizenToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.disputePayload("Need more investigation")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPUTED_REVIEW"));

        mockMvc.perform(get("/api/police/fir/queue?status=DISPUTED_REVIEW")
                        .header("Authorization", "Bearer " + officerOneToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(firId));

                                mockMvc.perform(post("/api/police/fir/" + firId + "/dispute/respond")
                                                                                                .header("Authorization", "Bearer " + officerTwoToken)
                                                                                                .contentType(MediaType.APPLICATION_JSON)
                                                                                                .content(TestDataFactory.disputeResponsePayload("Reopened by another officer", "INVESTIGATING", true)))
                .andExpect(status().isConflict())
                                        .andExpect(ApiErrorAssertions.errorEnvelope("CONFLICT"));

                                mockMvc.perform(post("/api/police/fir/" + firId + "/dispute/respond")
                                                                                                .header("Authorization", "Bearer " + officerOneToken)
                                                                                                .contentType(MediaType.APPLICATION_JSON)
                                                                                                .content(TestDataFactory.disputeResponsePayload("Review accepted, reopening investigation", "INVESTIGATING", true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INVESTIGATING"));
    }

    @Test
    void citizenCannotAccessPoliceQueue() throws Exception {
        String citizenToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen Role", "citizen.role@test.com", "444455556660", "CITIZEN");
        mockMvc.perform(get("/api/police/fir/queue")
                        .header("Authorization", "Bearer " + citizenToken))
                .andExpect(status().isForbidden());
    }
}
