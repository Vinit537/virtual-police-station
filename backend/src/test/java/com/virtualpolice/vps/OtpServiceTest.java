package com.virtualpolice.vps;

import com.virtualpolice.vps.service.OtpService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Tag("integration")
class OtpServiceTest {

    @Autowired
    private OtpService otpService;

    @Test
    void shouldGenerateAndVerifyOtp() {
        String aadhaar = "123456789012";
        String otp = otpService.generateOtp(aadhaar);

        assertNotNull(otp);
        assertEquals(6, otp.length());
        assertTrue(otpService.verifyOtp(aadhaar, otp));
        assertTrue(otpService.isVerified(aadhaar));
    }
}
