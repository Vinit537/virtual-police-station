package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.JobRunLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface JobRunLedgerRepository extends JpaRepository<JobRunLedger, Long> {
    Optional<JobRunLedger> findByJobKey(String jobKey);
}
