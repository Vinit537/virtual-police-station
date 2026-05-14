package com.virtualpolice.vps.service;

import com.virtualpolice.vps.model.JobRunLedger;
import com.virtualpolice.vps.repository.JobRunLedgerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class JobLedgerService {
    private final JobRunLedgerRepository jobRunLedgerRepository;

    public JobLedgerService(JobRunLedgerRepository jobRunLedgerRepository) {
        this.jobRunLedgerRepository = jobRunLedgerRepository;
    }

    @Transactional
    public void markRun(String jobKey) {
        JobRunLedger ledger = jobRunLedgerRepository.findByJobKey(jobKey).orElseGet(() -> {
            JobRunLedger created = new JobRunLedger();
            created.setJobKey(jobKey);
            return created;
        });
        LocalDateTime now = LocalDateTime.now();
        ledger.setLastRunAt(now);
        ledger.setUpdatedAt(now);
        jobRunLedgerRepository.save(ledger);
    }
}
