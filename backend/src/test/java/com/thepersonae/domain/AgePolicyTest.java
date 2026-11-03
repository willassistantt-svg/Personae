package com.thepersonae.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AgePolicyTest {

    private final LocalDate today = LocalDate.of(2026, 11, 3);

    @Test
    void acceptsEighteenthBirthday() {
        assertTrue(AgePolicy.isAdult(LocalDate.of(2008, 11, 3), today));
    }

    @Test
    void rejectsTheDayBeforeEighteen() {
        assertFalse(AgePolicy.isAdult(LocalDate.of(2008, 11, 4), today));
    }

    @Test
    void rejectsMissingDate() {
        assertFalse(AgePolicy.isAdult(null, today));
    }
}
