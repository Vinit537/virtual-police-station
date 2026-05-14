package com.virtualpolice.vps;

import com.virtualpolice.vps.model.FirReport;
import com.virtualpolice.vps.repository.EvidenceRepository;
import com.virtualpolice.vps.repository.FirDraftRepository;
import com.virtualpolice.vps.repository.FirReportRepository;
import com.virtualpolice.vps.repository.PoliceOfficerRepository;
import com.virtualpolice.vps.repository.StatusLogRepository;
import com.virtualpolice.vps.repository.UserRepository;
import com.virtualpolice.vps.service.CategorizationService;
import com.virtualpolice.vps.service.FirService;
import com.virtualpolice.vps.service.GeoRoutingService;
import com.virtualpolice.vps.service.NotificationService;
import com.virtualpolice.vps.service.OcrService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Tag("unit")
class EvidenceValidationMatrixTest {
    @Test
    void shouldAcceptAllowedEvidenceTypes() {
        FirReportRepository firReportRepository = mock(FirReportRepository.class);
        FirDraftRepository firDraftRepository = mock(FirDraftRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        PoliceOfficerRepository policeOfficerRepository = mock(PoliceOfficerRepository.class);
        EvidenceRepository evidenceRepository = mock(EvidenceRepository.class);
        StatusLogRepository statusLogRepository = mock(StatusLogRepository.class);
        OcrService ocrService = mock(OcrService.class);
        CategorizationService categorizationService = mock(CategorizationService.class);
        GeoRoutingService geoRoutingService = mock(GeoRoutingService.class);
        NotificationService notificationService = mock(NotificationService.class);

        FirService firService = new FirService(
                firReportRepository,
                firDraftRepository,
                userRepository,
                policeOfficerRepository,
                evidenceRepository,
                statusLogRepository,
                ocrService,
                categorizationService,
                geoRoutingService,
                notificationService
        );

        FirReport fir = new FirReport();
        when(firReportRepository.findById(1L)).thenReturn(Optional.of(fir));
        when(evidenceRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MockMultipartFile pdf = new MockMultipartFile("file", "evidence.pdf", "application/pdf", "pdf".getBytes());
        MockMultipartFile txt = new MockMultipartFile("file", "evidence.txt", "text/plain", "txt".getBytes());
        MockMultipartFile doc = new MockMultipartFile("file", "evidence.doc", "application/msword", "doc".getBytes());
        MockMultipartFile docx = new MockMultipartFile("file", "evidence.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx".getBytes());
        MockMultipartFile rtf = new MockMultipartFile("file", "evidence.rtf", "application/rtf", "rtf".getBytes());
        MockMultipartFile odt = new MockMultipartFile("file", "evidence.odt", "application/vnd.oasis.opendocument.text", "odt".getBytes());

        assertDoesNotThrow(() -> firService.uploadEvidence(1L, pdf));
        assertDoesNotThrow(() -> firService.uploadEvidence(1L, txt));
        assertDoesNotThrow(() -> firService.uploadEvidence(1L, doc));
        assertDoesNotThrow(() -> firService.uploadEvidence(1L, docx));
        assertDoesNotThrow(() -> firService.uploadEvidence(1L, rtf));
        assertDoesNotThrow(() -> firService.uploadEvidence(1L, odt));
    }
}
