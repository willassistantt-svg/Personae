package com.thepersonae.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.thepersonae.config.AppProperties;
import com.thepersonae.domain.EmailLog;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.EmailLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final AppProperties properties;
    private final EmailLogRepository logs;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newHttpClient();

    public EmailService(AppProperties properties, EmailLogRepository logs, ObjectMapper mapper) {
        this.properties = properties;
        this.logs = logs;
        this.mapper = mapper;
    }

    public String sendAwaitingApproval(UserAccount user) {
        boolean pt = isPortuguese(user);
        String subject = pt
                ? "The Personae — recebemos o seu pedido de acesso"
                : "The Personae — we received your access request";
        String body = pt
                ? "<p>Olá " + user.getFirstName() + ",</p><p>O seu pedido entrou na casa. Cada cadastro é analisado pessoalmente. Quando houver um aceite, enviamos um link para você criar a senha. Até lá, o acesso permanece fechado.</p><p>The Personae · thepersonae.com</p>"
                : "<p>Hello " + user.getFirstName() + ",</p><p>Your request has entered the house. Every application is reviewed in person. When it is accepted, we send a link so you can create your password. Until then, access stays closed.</p><p>The Personae · thepersonae.com</p>";
        return dispatch(user.getEmail(), subject, body);
    }

    public String sendAccessLink(UserAccount user, String link, boolean reset) {
        boolean pt = isPortuguese(user);
        String subject;
        String intro;
        if (reset) {
            subject = pt ? "The Personae — criar uma nova senha" : "The Personae — create a new password";
            intro = pt
                    ? "Use o link abaixo para escolher uma nova senha. Ele expira em algumas horas e pode ser usado uma vez."
                    : "Use the link below to choose a new password. It expires within a few hours and can be used once.";
        } else {
            subject = pt ? "The Personae — o seu acesso foi reservado" : "The Personae — your access has been reserved";
            intro = pt
                    ? "O seu cadastro foi aceito. Crie uma senha pelo link abaixo para entrar na casa."
                    : "Your application was accepted. Create a password with the link below to enter the house.";
        }
        String body = "<p>" + user.getFirstName() + ",</p><p>" + intro + "</p><p><a href=\"" + link + "\">" + link + "</a></p><p>The Personae · thepersonae.com</p>";
        return dispatch(user.getEmail(), subject, body);
    }

    private String dispatch(String to, String subject, String html) {
        String apiKey = properties.getResend().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            save(to, subject, "SKIPPED", "RESEND_API_KEY is empty. The link stays available to copy by hand.");
            log.info("Email skipped for {} — Resend is not configured", to);
            return "SKIPPED";
        }
        try {
            ObjectNode payload = mapper.createObjectNode();
            payload.put("from", properties.getResend().getFrom());
            ArrayNode recipients = payload.putArray("to");
            recipients.add(to);
            payload.put("subject", subject);
            payload.put("html", html);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                save(to, subject, "SENT", "Resend accepted the message");
                return "SENT";
            }
            String detail = response.body() == null ? "" : response.body();
            if (detail.length() > 380) {
                detail = detail.substring(0, 380);
            }
            save(to, subject, "FAILED", "Resend HTTP " + response.statusCode() + " " + detail);
            return "FAILED";
        } catch (Exception ex) {
            save(to, subject, "FAILED", ex.getMessage());
            log.warn("Email failed for {}", to, ex);
            return "FAILED";
        }
    }

    private void save(String to, String subject, String status, String detail) {
        EmailLog entry = new EmailLog();
        entry.setRecipient(to);
        entry.setSubject(subject);
        entry.setStatus(status);
        entry.setDetail(detail == null ? "" : detail.substring(0, Math.min(400, detail.length())));
        entry.setCreatedAt(Instant.now());
        logs.save(entry);
    }

    private boolean isPortuguese(UserAccount user) {
        return user.getLocale() == null || user.getLocale().startsWith("pt");
    }
}
