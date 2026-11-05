package com.thepersonae.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatHubTest {

    private final ChatHub hub = new ChatHub(new ObjectMapper());

    private record Socket(WebSocketSession session, List<String> received) {
    }

    private Socket socket(String id) throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        List<String> received = new ArrayList<>();
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        doAnswer(call -> received.add(((TextMessage) call.getArgument(0)).getPayload())).when(session).sendMessage(any());
        return new Socket(session, received);
    }

    @Test
    void tellsMembersWhenTheHouseComesAndGoes() throws Exception {
        UUID member = UUID.randomUUID();
        UUID admin = UUID.randomUUID();
        Socket memberSocket = socket("m1");
        hub.register(memberSocket.session(), member, false);
        assertThat(memberSocket.received()).containsExactly("{\"type\":\"hello\",\"houseOnline\":false}");

        Socket adminTab1 = socket("a1");
        Socket adminTab2 = socket("a2");
        hub.register(adminTab1.session(), admin, true);
        hub.register(adminTab2.session(), admin, true);
        assertThat(hub.houseOnline()).isTrue();
        assertThat(memberSocket.received()).filteredOn(text -> text.contains("\"house\"")).containsExactly("{\"type\":\"house\",\"online\":true}");

        hub.unregister(adminTab1.session());
        assertThat(memberSocket.received()).filteredOn(text -> text.contains("\"house\"")).hasSize(1);
        hub.unregister(adminTab2.session());
        assertThat(hub.houseOnline()).isFalse();
        assertThat(memberSocket.received()).last().isEqualTo("{\"type\":\"house\",\"online\":false}");
    }

    @Test
    void reportsMemberPresenceOnlyOnFirstAndLastTab() throws Exception {
        UUID member = UUID.randomUUID();
        Socket adminSocket = socket("a1");
        hub.register(adminSocket.session(), UUID.randomUUID(), true);
        Socket tab1 = socket("m1");
        Socket tab2 = socket("m2");
        hub.register(tab1.session(), member, false);
        hub.register(tab2.session(), member, false);
        hub.unregister(tab1.session());
        assertThat(hub.memberOnline(member)).isTrue();
        hub.unregister(tab2.session());
        assertThat(hub.memberOnline(member)).isFalse();
        assertThat(adminSocket.received()).filteredOn(text -> text.contains("presence")).containsExactly(
                "{\"type\":\"presence\",\"memberId\":\"" + member + "\",\"online\":true}",
                "{\"type\":\"presence\",\"memberId\":\"" + member + "\",\"online\":false}");
    }

    @Test
    void deliversOnlyToTheAddressedMemberAndClosesOnDisconnect() throws Exception {
        UUID alice = UUID.randomUUID();
        UUID bruno = UUID.randomUUID();
        Socket aliceSocket = socket("alice");
        Socket brunoSocket = socket("bruno");
        hub.register(aliceSocket.session(), alice, false);
        hub.register(brunoSocket.session(), bruno, false);
        hub.toMember(alice, Map.of("type", "message"));
        assertThat(aliceSocket.received()).last().isEqualTo("{\"type\":\"message\"}");
        assertThat(brunoSocket.received()).noneMatch(text -> text.contains("message"));

        hub.disconnect(alice);
        verify(aliceSocket.session()).close(CloseStatus.POLICY_VIOLATION);
        assertThat(hub.memberOnline(alice)).isFalse();
        assertThat(hub.memberOnline(bruno)).isTrue();
    }
}
