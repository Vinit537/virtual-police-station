package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.EventLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventLogRepository extends JpaRepository<EventLog, Long> {
    List<EventLog> findTop20ByOrderByCreatedAtDesc();
}
