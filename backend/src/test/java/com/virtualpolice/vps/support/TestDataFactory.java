package com.virtualpolice.vps.support;

public final class TestDataFactory {
    private TestDataFactory() {
    }

    public static String firCreatePayload(String title, String description, String location, String aadhaar, String keywords) {
        return """
                {
                  "title":"%s",
                  "description":"%s",
                  "location":"%s",
                  "aadhaarNumber":"%s",
                  "ocrExtractedText":"",
                  "ocrKeywords":"%s"
                }
                """.formatted(title, description, location, aadhaar, keywords);
    }

    public static String resolvePayload(boolean evidenceReviewed) {
        return """
                {
                  "closureSummary":"Internal closure note",
                  "citizenSummary":"Case resolved and evidence verified",
                  "officerNote":"All witnesses contacted",
                  "evidenceReviewed":%s
                }
                """.formatted(evidenceReviewed);
    }

    public static String disputePayload(String reason) {
        return """
                {"reason":"%s"}
                """.formatted(reason);
    }

    public static String disputeResponsePayload(String responseNote, String nextStatus, boolean evidenceReviewed) {
        return """
                {
                  "responseNote":"%s",
                  "nextStatus":"%s",
                  "evidenceReviewed":%s
                }
                """.formatted(responseNote, nextStatus, evidenceReviewed);
    }

    public static String adminReassignPayload(Long officerId, String station, String reason) {
        return """
                {
                  "officerId":%s,
                  "station":"%s",
                  "reason":"%s"
                }
                """.formatted(officerId == null ? "null" : officerId.toString(), station == null ? "" : station, reason == null ? "" : reason);
    }

    public static String adminPriorityOverridePayload(String priority, String reason) {
        return """
                {
                  "priority":"%s",
                  "reason":"%s"
                }
                """.formatted(priority, reason);
    }

    public static String adminEscalatePayload(String note, String dueAt) {
        return """
                {
                  "note":"%s",
                  "dueAt":"%s"
                }
                """.formatted(note, dueAt);
    }

    public static String adminRequestUpdatePayload(String message, String dueAt) {
        return """
                {
                  "message":"%s",
                  "dueAt":"%s"
                }
                """.formatted(message, dueAt);
    }

    public static String adminReopenPayload(String nextStatus, String reason) {
        return """
                {
                  "nextStatus":"%s",
                  "reason":"%s"
                }
                """.formatted(nextStatus, reason);
    }

    public static String caseActionPayload(String actionType, String idempotencyKey) {
        return """
                {
                  "actionType":"%s",
                  "idempotencyKey":"%s"
                }
                """.formatted(actionType, idempotencyKey);
    }
}
