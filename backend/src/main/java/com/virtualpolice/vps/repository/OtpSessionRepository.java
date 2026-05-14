package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.OtpSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpSessionRepository extends JpaRepository<OtpSession, Long> {
    Optional<OtpSession> findTopByAadhaarNumberOrderByIdDesc(String aadhaarNumber);
}
