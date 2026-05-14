package com.virtualpolice.vps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.virtualpolice.vps.repository.CaseEventRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("integration")
class CaseWorkflowIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CaseEventRepository caseEventRepository;

    @Test
    void v2CaseActionShouldBeIdempotentAndLogged() throws Exception {
                String citizenToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen Case", "citizen.case@test.com", "777788889990", "CITIZEN");
                String policeToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Officer Case", "officer.case@test.com", "777788889992", "POLICE");

        String firResponse = mockMvc.perform(post("/api/citizen/fir")
                        .header("Authorization", "Bearer " + citizenToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.firCreatePayload("Case Action", "Lost wallet", "Indore", "777788889990", "theft")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long firId = objectMapper.readTree(firResponse).get("id").asLong();

        mockMvc.perform(post("/api/v2/cases/" + firId + "/actions/ACKNOWLEDGE")
                        .header("Authorization", "Bearer " + citizenToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idempotencyKey\":\"ack-1\"}"))
                .andExpect(status().isConflict())
                .andExpect(ApiErrorAssertions.errorEnvelope("CONFLICT"));

        mockMvc.perform(post("/api/v2/cases/" + firId + "/actions/DISPUTE")
                        .header("Authorization", "Bearer " + citizenToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"disputeReason\":\"Need review\",\"idempotencyKey\":\"disp-1\"}"))
                .andExpect(status().isConflict())
                .andExpect(ApiErrorAssertions.errorEnvelope("CONFLICT"));

                long countBefore = caseEventRepository.count();
                mockMvc.perform(post("/api/v2/cases/" + firId + "/actions/UPDATE")
                                                .header("Authorization", "Bearer " + citizenToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_REVIEW\",\"idempotencyKey\":\"update-1\"}"))
                .andExpect(status().isConflict())
                .andExpect(ApiErrorAssertions.errorEnvelope("CONFLICT"));

                long countAfter = caseEventRepository.count();
                if (countAfter < countBefore) {
                        throw new AssertionError("Case events should not decrease");
                }

                mockMvc.perform(post("/api/v2/cases/" + firId + "/actions/UPDATE")
                                                .header("Authorization", "Bearer " + policeToken)
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content("{\"status\":\"UNDER_REVIEW\",\"idempotencyKey\":\"update-2\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.fir.status").value("UNDER_REVIEW"));

                long afterFirst = caseEventRepository.count();

                mockMvc.perform(post("/api/v2/cases/" + firId + "/actions/UPDATE")
                                                .header("Authorization", "Bearer " + policeToken)
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content("{\"status\":\"UNDER_REVIEW\",\"idempotencyKey\":\"update-2\"}"))
                                .andExpect(status().isOk());

                long afterSecond = caseEventRepository.count();
                if (afterSecond != afterFirst) {
                        throw new AssertionError("Idempotency should prevent duplicate case events");
                }
    }

    @Test
    void v2CaseQueueShouldReturnCitizenCases() throws Exception {
        String citizenToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen Queue", "citizen.queue.v2@test.com", "777788889991", "CITIZEN");

        String firResponse = mockMvc.perform(post("/api/citizen/fir")
                        .header("Authorization", "Bearer " + citizenToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.firCreatePayload("Queue V2", "Wallet lost", "Pune", "777788889991", "theft")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long firId = objectMapper.readTree(firResponse).get("id").asLong();

        mockMvc.perform(get("/api/v2/cases/queue")
                        .header("Authorization", "Bearer " + citizenToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(firId));
    }
}
