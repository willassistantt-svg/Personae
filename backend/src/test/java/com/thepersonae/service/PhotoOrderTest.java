package com.thepersonae.service;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PhotoOrderTest {

    private final Map<String, String> saved = savedPhotos();

    private static Map<String, String> savedPhotos() {
        Map<String, String> photos = new LinkedHashMap<>();
        photos.put("a", "A");
        photos.put("b", "B");
        return photos;
    }

    @Test
    void placesNewPhotosAmongSavedOnes() {
        List<String> result = ProfileAdminService.orderPhotos(List.of("new:1", "a", "new:0", "b"), saved, List.of("N0", "N1"));
        assertThat(result).containsExactly("N1", "A", "N0", "B");
    }

    @Test
    void keepsCurrentOrderWithoutTokens() {
        assertThat(ProfileAdminService.orderPhotos(null, saved, List.of("N0"))).containsExactly("A", "B", "N0");
    }

    @Test
    void ignoresUnknownRepeatedAndMalformedTokensAndAppendsTheRest() {
        List<String> result = ProfileAdminService.orderPhotos(List.of("b", "b", "zzz", "new:9", "new:x", "new:0"), saved, List.of("N0", "N1"));
        assertThat(result).containsExactly("B", "N0", "A", "N1");
    }
}
