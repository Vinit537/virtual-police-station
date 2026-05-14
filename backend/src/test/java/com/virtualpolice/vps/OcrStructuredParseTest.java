package com.virtualpolice.vps;

import com.virtualpolice.vps.service.OcrService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class OcrStructuredParseTest {
    private final OcrService ocrService = new OcrService("tesseract", 5120);

    @Test
    void shouldExtractStructuredFields() {
        String text = "Name: Ravi Kumar\nLocation: Vijay Nagar\nTheft and fraud happened near market.";
        OcrService.ParsedOcrData parsed = ocrService.parseStructuredData(text);

        assertEquals("Ravi Kumar", parsed.name());
        assertEquals("Vijay Nagar", parsed.location());
        assertTrue(parsed.keywords().contains("theft"));
    }
}
