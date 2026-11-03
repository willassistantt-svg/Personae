package com.thepersonae.domain;

public final class PasswordPolicy {

    private PasswordPolicy() {
    }

    public static String violation(String password) {
        if (password == null || password.length() < 8) {
            return "short";
        }
        boolean letter = password.chars().anyMatch(Character::isLetter);
        boolean digit = password.chars().anyMatch(Character::isDigit);
        if (!letter || !digit) {
            return "weak";
        }
        return null;
    }
}
