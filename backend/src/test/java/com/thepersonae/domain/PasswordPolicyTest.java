package com.thepersonae.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class PasswordPolicyTest {

    @Test
    void acceptsLetterAndNumber() {
        assertNull(PasswordPolicy.violation("MemberAccess1"));
    }

    @Test
    void rejectsShortPassword() {
        assertEquals("short", PasswordPolicy.violation("Ab1"));
    }

    @Test
    void rejectsPasswordWithoutADigit() {
        assertEquals("weak", PasswordPolicy.violation("somenteLetras"));
    }
}
