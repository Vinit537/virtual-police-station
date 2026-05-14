package com.virtualpolice.vps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.virtualpolice.vps.support.TestAuthHelper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("integration")
class AuthAndFirIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void fullCitizenFlowShouldWork() throws Exception {
        TestAuthHelper.generateAndVerifyOtp(mockMvc, objectMapper, "111122223334");

        String registerPayload = """
                {
                  "fullName":"Citizen Flow",
                  "email":"citizen.flow@test.com",
                  "password":"Password@123",
                  "aadhaarNumber":"111122223334",
                  "role":"CITIZEN"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());

        String loginBody = """
                {"email":"citizen.flow@test.com","password":"Password@123"}
                """;

        String loginResp = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode loginJson = objectMapper.readTree(loginResp);
        String token = loginJson.get("token").asText();

        MockMultipartFile ocrFile = new MockMultipartFile(
                "file",
                "complaint.txt",
                "text/plain",
                "Name: Citizen Flow\nLocation: Indore\nMy phone was stolen and this was a theft complaint".getBytes()
        );

        String ocrResp = mockMvc.perform(multipart("/api/citizen/ocr/extract")
                        .file(ocrFile)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestedLocation").value("Indore"))
                .andExpect(jsonPath("$.keywords").exists())
                .andReturn().getResponse().getContentAsString();

        String extractedText = objectMapper.readTree(ocrResp).get("extractedText").asText();

        String firPayload = """
                {
                  "title":"Phone Theft",
                  "description":"My phone was stolen near market",
                  "location":"Indore",
                  "aadhaarNumber":"111122223334",
                  "ocrExtractedText":%s,
                  "ocrKeywords":"theft"
                }
                """.formatted(objectMapper.writeValueAsString(extractedText));

        mockMvc.perform(post("/api/citizen/fir")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").exists())
                .andExpect(jsonPath("$.digitalSignatureHash").exists());
    }
}
