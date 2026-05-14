package com.virtualpolice.vps.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "case_events")
public class CaseEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "fir_id")
    private FirReport fir;

    @Column(nullable = false, length = 80)
    private String eventType;

    @Column(nullable = false, length = 40)
    private String actorRole;

    @Column(nullable = false, length = 200)
    private String actorRef;

    @Column(columnDefinition = "TEXT")
    private String payloadJson;

    @Column(length = 120)
    private String correlationId;

    @Column(nullable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public FirReport getFir() {
        return fir;
    }

    public void setFir(FirReport fir) {
        this.fir = fir;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
    }

    public String getActorRef() {
        return actorRef;
    }

    public void setActorRef(String actorRef) {
        this.actorRef = actorRef;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(LocalDateTime occurredAt) {
        this.occurredAt = occurredAt;
    }
}
