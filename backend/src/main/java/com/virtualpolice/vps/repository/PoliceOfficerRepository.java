package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.PoliceOfficer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoliceOfficerRepository extends JpaRepository<PoliceOfficer, Long> {
    Optional<PoliceOfficer> findByUserId(Long userId);
    Optional<PoliceOfficer> findByUserEmail(String email);
}
