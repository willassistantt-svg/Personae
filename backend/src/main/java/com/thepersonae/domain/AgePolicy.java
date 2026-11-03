package com.thepersonae.domain;

import java.time.LocalDate;

public final class AgePolicy {

    public static final int MINIMUM_AGE = 18;

    private AgePolicy() {
    }

    public static boolean isAdult(LocalDate birthDate, LocalDate today) {
        if (birthDate == null || today == null) {
            return false;
        }
        return !birthDate.isAfter(today.minusYears(MINIMUM_AGE));
    }
}
