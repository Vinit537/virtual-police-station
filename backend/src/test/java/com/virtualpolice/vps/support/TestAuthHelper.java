package com.virtualpolice.vps.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public final class TestAuthHelper {
    private TestAuthHelper() {
    }

    public static String registerAndLogin(MockMvc mockMvc,
                                          ObjectMapper objectMapper,
                                          String fullName,
                                          String email,
                                          String aadhaar,
                                          String role) throws Exception {
        generateAndVerifyOtp(mockMvc, objectMapper, aadhaar);

        String register = """
                {
                  "fullName":"%s",
                  "email":"%s",
                  "password":"Password@123",
                  "aadhaarNumber":"%s",
                  "role":"%s"
                }
                """.formatted(fullName, email, aadhaar, role);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(register))
                .andExpect(status().isOk());

        String login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password@123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(login);
        return json.get("token").asText();
    }

    public static void generateAndVerifyOtp(MockMvc mockMvc, ObjectMapper objectMapper, String aadhaar) throws Exception {
        String otpGen = mockMvc.perform(post("/api/auth/otp/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"aadhaarNumber\":\"" + aadhaar + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String otp = objectMapper.readTree(otpGen).get("debugOtp").asText();

        mockMvc.perform(post("/api/auth/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"aadhaarNumber\":\"" + aadhaar + "\",\"otp\":\"" + otp + "\"}"))
                .andExpect(status().isOk());
    }
}
