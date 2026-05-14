package com.virtualpolice.vps;

import com.virtualpolice.vps.support.TestAuthHelper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.virtualpolice.vps.repository.UserRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("integration")
@Tag("security")
class SecurityAccessTest {

    @Autowired
    private MockMvc mockMvc;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Autowired
  private ObjectMapper objectMapper;

    @Test
    void citizenEndpointShouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/citizen/fir"))
                .andExpect(status().isForbidden());
    }

    @Test
    void passwordShouldBeEncryptedOnRegister() throws Exception {
      TestAuthHelper.generateAndVerifyOtp(mockMvc, objectMapper, "123443211234");

        String registerPayload = """
                {
                  "fullName":"Enc User",
                  "email":"enc@test.com",
                  "password":"Password@123",
                  "aadhaarNumber":"123443211234",
                  "role":"CITIZEN"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isOk());

        String storedHash = userRepository.findByEmail("enc@test.com").orElseThrow().getPasswordHash();
        org.junit.jupiter.api.Assertions.assertNotEquals("Password@123", storedHash);
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches("Password@123", storedHash));
    }
}
