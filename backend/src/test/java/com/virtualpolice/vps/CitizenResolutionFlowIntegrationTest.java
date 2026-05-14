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
class CitizenResolutionFlowIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void citizenCanDisputeResolvedCaseAndOtherCitizenCannot() throws Exception {
                String citizenToken1 = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen One", "citizen.one@test.com", "111122223330", "CITIZEN");
                String citizenToken2 = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen Two", "citizen.two@test.com", "111122223331", "CITIZEN");
                String policeToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Officer One", "officer.one@test.com", "111122223332", "POLICE");

        String firPayload = TestDataFactory.firCreatePayload(
                "Fraud complaint",
                "Suspicious transaction happened",
                "Indore",
                "111122223330",
                "fraud"
        );

        String firResponse = mockMvc.perform(post("/api/citizen/fir")
                        .header("Authorization", "Bearer " + citizenToken1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firPayload))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Long firId = objectMapper.readTree(firResponse).get("id").asLong();

        mockMvc.perform(patch("/api/police/fir/" + firId)
                        .header("Authorization", "Bearer " + policeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_REVIEW\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/police/fir/" + firId)
                        .header("Authorization", "Bearer " + policeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INVESTIGATING\"}"))
                .andExpect(status().isOk());

                                mockMvc.perform(post("/api/police/fir/" + firId + "/resolve")
                                                                                                .header("Authorization", "Bearer " + policeToken)
                                                                                                .contentType(MediaType.APPLICATION_JSON)
                                                                                                .content(TestDataFactory.resolvePayload(true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AWAITING_CITIZEN_ACK"));

        mockMvc.perform(get("/api/citizen/fir/" + firId)
                        .header("Authorization", "Bearer " + citizenToken1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AWAITING_CITIZEN_ACK"))
                .andExpect(jsonPath("$.acknowledgementDueAt").exists());

        mockMvc.perform(post("/api/citizen/fir/" + firId + "/dispute")
                        .header("Authorization", "Bearer " + citizenToken1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.disputePayload("Evidence was not reviewed")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPUTED_REVIEW"))
                .andExpect(jsonPath("$.disputeReason").value("Evidence was not reviewed"));

        mockMvc.perform(post("/api/citizen/fir/" + firId + "/acknowledge")
                        .header("Authorization", "Bearer " + citizenToken2))
                .andExpect(status().isBadRequest())
                .andExpect(ApiErrorAssertions.errorEnvelope("BAD_REQUEST"));

        mockMvc.perform(post("/api/citizen/fir/" + firId + "/acknowledge")
                        .header("Authorization", "Bearer " + policeToken))
                .andExpect(status().isForbidden());
    }

}
