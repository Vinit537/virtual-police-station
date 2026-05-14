package com.virtualpolice.vps;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.Role;
import com.virtualpolice.vps.service.AuthService;
import com.virtualpolice.vps.service.FirService;
import com.virtualpolice.vps.service.OtpService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Tag("integration")
@Tag("perf")
class PerformanceSimulationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private OtpService otpService;

    @Autowired
    private FirService firService;

    @Test
    void shouldHandleMultipleFirSubmissions() {
        String registrationOtp = otpService.generateOtp("987654321098");
        otpService.verifyOtp("987654321098", registrationOtp);

        authService.register(new AuthDtos.RegisterRequest(
                "Load Citizen",
                "load.citizen@test.com",
                "Password@123",
                "987654321098",
                Role.CITIZEN
        ));

        long start = System.currentTimeMillis();
        for (int i = 0; i < 20; i++) {
            firService.createFir("load.citizen@test.com", new AuthDtos.FirCreateRequest(
                    "Case " + i,
                    "Fraud transaction case " + i,
                    "Vijay Nagar",
                    "987654321098",
                    "OCR extracted fraud complaint text",
                    "fraud"
            ));
        }
        long elapsed = System.currentTimeMillis() - start;

        assertTrue(elapsed < 10_000);
    }
}
