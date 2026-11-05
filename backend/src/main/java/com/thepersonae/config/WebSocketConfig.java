package com.thepersonae.config;

import com.thepersonae.web.ChatSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

@Configuration
@EnableWebSocket
@EnableScheduling
public class WebSocketConfig implements WebSocketConfigurer {

    public static final String CHAT_SOCKET = "/api/chat/socket";

    private final ChatSocketHandler handler;
    private final AppProperties properties;

    public WebSocketConfig(ChatSocketHandler handler, AppProperties properties) {
        this.handler = handler;
        this.properties = properties;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        Set<String> origins = new LinkedHashSet<>();
        Arrays.stream(properties.getCorsOrigins().split(",")).map(String::trim).filter(value -> !value.isEmpty()).forEach(origins::add);
        if (properties.getPublicUrl() != null && !properties.getPublicUrl().isBlank()) {
            origins.add(properties.getPublicUrl().trim());
        }
        registry.addHandler(handler, CHAT_SOCKET).setAllowedOrigins(origins.toArray(String[]::new));
    }
}
