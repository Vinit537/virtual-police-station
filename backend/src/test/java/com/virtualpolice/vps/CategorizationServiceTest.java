package com.virtualpolice.vps;

import com.virtualpolice.vps.service.CategorizationService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("unit")
class CategorizationServiceTest {
    private final CategorizationService categorizationService = new CategorizationService();

    @Test
    void shouldIdentifyCybercrimeAndHighPriority() {
        CategorizationService.CategorizationResult result = categorizationService.analyze(
                "I got hacked via phishing and online fraud with repeated scam attempts"
        );
        assertEquals("CYBERCRIME", result.category());
        assertEquals("HIGH", result.priority());
    }
}
