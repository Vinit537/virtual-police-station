package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.StatusLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface StatusLogRepository extends JpaRepository<StatusLog, Long> {
    List<StatusLog> findByFirIdOrderByUpdatedAtAsc(Long firId);
    void deleteByFirIdIn(Collection<Long> firIds);
}
