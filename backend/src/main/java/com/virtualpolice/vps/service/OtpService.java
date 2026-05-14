package com.virtualpolice.vps.service;

import com.virtualpolice.vps.model.OtpSession;
import com.virtualpolice.vps.repository.OtpSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class OtpService {
    private final OtpSessionRepository otpSessionRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long ttlSeconds;

    public OtpService(OtpSessionRepository otpSessionRepository,
                      @Value("${app.otp.ttl-seconds}") long ttlSeconds) {
        this.otpSessionRepository = otpSessionRepository;
        this.ttlSeconds = ttlSeconds;
    }

    public String generateOtp(String aadhaarNumber) {
        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        OtpSession session = new OtpSession();
        session.setAadhaarNumber(aadhaarNumber);
        session.setOtpCode(otp);
        session.setExpiresAt(LocalDateTime.now().plusSeconds(ttlSeconds));
        session.setVerified(false);
        otpSessionRepository.save(session);
        return otp;
    }

    public boolean verifyOtp(String aadhaarNumber, String otp) {
        return otpSessionRepository.findTopByAadhaarNumberOrderByIdDesc(aadhaarNumber)
                .filter(session -> session.getExpiresAt().isAfter(LocalDateTime.now()))
                .filter(session -> session.getOtpCode().equals(otp))
                .map(session -> {
                    session.setVerified(true);
                    otpSessionRepository.save(session);
                    return true;
                })
                .orElse(false);
    }

    public boolean isVerified(String aadhaarNumber) {
        return otpSessionRepository.findTopByAadhaarNumberOrderByIdDesc(aadhaarNumber)
                .filter(session -> session.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(OtpSession::isVerified)
                .orElse(false);
    }
}
