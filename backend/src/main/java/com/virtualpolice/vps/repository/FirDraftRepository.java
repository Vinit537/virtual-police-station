package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.FirDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FirDraftRepository extends JpaRepository<FirDraft, Long> {
    Optional<FirDraft> findByIdAndCitizenId(Long id, Long citizenId);
    Optional<FirDraft> findTopByCitizenIdOrderByUpdatedAtDesc(Long citizenId);
}
