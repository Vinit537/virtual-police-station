package com.virtualpolice.vps;

import com.virtualpolice.vps.model.JobRunLedger;
import com.virtualpolice.vps.repository.JobRunLedgerRepository;
import com.virtualpolice.vps.service.JobLedgerService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
@Tag("integration")
class JobLedgerServiceTest {

    @Autowired
    private JobLedgerService jobLedgerService;

    @Autowired
    private JobRunLedgerRepository jobRunLedgerRepository;

    @Test
    void markRunShouldUpdateExistingEntry() {
        jobLedgerService.markRun("citizen-ack-auto-close");
        JobRunLedger first = jobRunLedgerRepository.findByJobKey("citizen-ack-auto-close").orElseThrow();
        jobLedgerService.markRun("citizen-ack-auto-close");
        JobRunLedger second = jobRunLedgerRepository.findByJobKey("citizen-ack-auto-close").orElseThrow();

        assertNotNull(first.getUpdatedAt());
        assertNotNull(second.getUpdatedAt());
        assertEquals(first.getJobKey(), second.getJobKey());
    }
}
