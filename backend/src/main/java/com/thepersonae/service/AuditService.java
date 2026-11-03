package com.thepersonae.service;

import com.thepersonae.domain.AuditEvent;
import com.thepersonae.repository.AuditEventRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuditService {

    private final AuditEventRepository events;

    public AuditService(AuditEventRepository events) {
        this.events = events;
    }

    public void record(String type, String subject, String status) {
        record(type, subject, status, Instant.now());
    }

    public void record(String type, String subject, String status, Instant when) {
        AuditEvent event = new AuditEvent();
        event.setEventType(type);
        event.setSubject(trim(subject));
        event.setStatus(status);
        event.setCreatedAt(when);
        events.save(event);
    }

    private String trim(String subject) {
        if (subject == null) {
            return "";
        }
        return subject.length() <= 200 ? subject : subject.substring(0, 200);
    }
}
