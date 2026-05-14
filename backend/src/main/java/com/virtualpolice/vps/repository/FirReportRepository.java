package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.FirReport;
import com.virtualpolice.vps.model.FirStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FirReportRepository extends JpaRepository<FirReport, Long> {
    List<FirReport> findByCitizenId(Long citizenId);
    List<FirReport> findByCitizenIdIn(List<Long> citizenIds);
    List<FirReport> findByAssignedOfficerIdIn(List<Long> officerIds);
    Optional<FirReport> findByIdAndCitizenId(Long id, Long citizenId);
    List<FirReport> findByStatusAndAcknowledgementDueAtBefore(FirStatus status, LocalDateTime time);
}
