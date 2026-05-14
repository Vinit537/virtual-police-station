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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("integration")
@Tag("security")
class SecurityHardeningIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void citizenCannotAccessAnotherCitizenFir() throws Exception {
        String citizenOneToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen One", "citizen.one.sec@test.com", "555500001111", "CITIZEN");
        String citizenTwoToken = TestAuthHelper.registerAndLogin(mockMvc, objectMapper, "Citizen Two", "citizen.two.sec@test.com", "555500001112", "CITIZEN");

        String firResponse = mockMvc.perform(post("/api/citizen/fir")
                        .header("Authorization", "Bearer " + citizenOneToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestDataFactory.firCreatePayload("IDOR Test", "Attempt access", "Indore", "555500001111", "fraud")))
                .andReturn().getResponse().getContentAsString();
        long firId = objectMapper.readTree(firResponse).get("id").asLong();

        mockMvc.perform(get("/api/citizen/fir/" + firId)
                        .header("Authorization", "Bearer " + citizenTwoToken))
                .andExpect(status().isBadRequest())
                .andExpect(ApiErrorAssertions.errorEnvelope("BAD_REQUEST"));
    }

    @Test
    void tamperedJwtShouldBeRejected() throws Exception {
        mockMvc.perform(get("/api/citizen/fir")
                        .header("Authorization", "Bearer tampered.token.value"))
                .andExpect(status().isForbidden());
    }
}
