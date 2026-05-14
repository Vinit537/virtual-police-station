package com.virtualpolice.vps.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CitizenAckScheduler {
    private final FirService firService;
    private final JobLedgerService jobLedgerService;

    public CitizenAckScheduler(FirService firService, JobLedgerService jobLedgerService) {
        this.firService = firService;
        this.jobLedgerService = jobLedgerService;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void autoCloseExpiredCitizenAcknowledgements() {
        firService.autoCloseExpiredAcknowledgements();
        jobLedgerService.markRun("citizen-ack-auto-close");
    }
}
