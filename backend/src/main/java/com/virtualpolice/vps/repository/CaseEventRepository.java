package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.CaseEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CaseEventRepository extends JpaRepository<CaseEvent, Long> {
    List<CaseEvent> findByFirIdOrderByOccurredAtAsc(Long firId);
    Optional<CaseEvent> findFirstByFirIdAndCorrelationIdOrderByOccurredAtDesc(Long firId, String correlationId);
}
