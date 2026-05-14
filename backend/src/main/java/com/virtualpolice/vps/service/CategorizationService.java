package com.virtualpolice.vps.service;

import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CategorizationService {
    private static final Map<String, List<String>> KEYWORDS = Map.of(
            "THEFT", List.of("theft", "stolen", "robbery", "snatch", "burglary"),
            "CYBERCRIME", List.of("cyber", "phishing", "otp scam", "hacked", "online fraud"),
            "ASSAULT", List.of("assault", "attack", "injury", "beaten", "violence"),
            "FRAUD", List.of("fraud", "cheat", "forgery", "fake", "scam")
    );

    public CategorizationResult analyze(String text) {
        String value = text == null ? "" : text.toLowerCase();

        Map<String, Long> scores = KEYWORDS.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().stream().filter(value::contains).count()
                ));

        Map.Entry<String, Long> top = scores.entrySet().stream()
                .max(Comparator.comparingLong(Map.Entry::getValue))
                .orElse(Map.entry("GENERAL", 0L));

        String category = top.getValue() > 0 ? top.getKey() : "GENERAL";

        long severeHits = List.of("knife", "weapon", "injury", "hospital", "repeat", "gang")
                .stream()
                .filter(value::contains)
                .count();
        String priority;
        if (severeHits >= 2 || top.getValue() >= 3) {
            priority = "HIGH";
        } else if (top.getValue() >= 1) {
            priority = "MEDIUM";
        } else {
            priority = "LOW";
        }

        return new CategorizationResult(category, priority);
    }

    public record CategorizationResult(String category, String priority) {
    }
}
