package com.virtualpolice.vps.service;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.EventLog;
import com.virtualpolice.vps.repository.EventLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {
    private final EventLogRepository eventLogRepository;

    public NotificationService(EventLogRepository eventLogRepository) {
        this.eventLogRepository = eventLogRepository;
    }

    public void logEvent(String eventType, String message) {
        EventLog eventLog = new EventLog();
        eventLog.setEventType(eventType);
        eventLog.setMessage(message);
        eventLogRepository.save(eventLog);
    }

    public List<AuthDtos.EventLogResponse> recentEvents() {
        return eventLogRepository.findTop20ByOrderByCreatedAtDesc().stream()
                .map(event -> new AuthDtos.EventLogResponse(event.getEventType(), event.getMessage(), event.getCreatedAt()))
                .toList();
    }
}
