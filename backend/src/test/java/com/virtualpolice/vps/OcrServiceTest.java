package com.virtualpolice.vps;

import com.virtualpolice.vps.service.OcrService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

@Tag("unit")
class OcrServiceTest {
    private final OcrService ocrService = new OcrService("tesseract", 5120);

    @Test
    void shouldReadTextFromUploadedTxtFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "complaint.txt",
                "text/plain",
                "This is a fraud and cyber complaint.".getBytes()
        );

        String text = ocrService.extractText(file);

        assertTrue(text.toLowerCase().contains("fraud"));
    }

    @Test
    void shouldRejectUnsupportedFileTypes() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "malware.exe",
                "application/octet-stream",
                "dummy".getBytes()
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> ocrService.extractText(file));
        assertTrue(ex.getMessage().contains("Unsupported file type"));
    }
}
