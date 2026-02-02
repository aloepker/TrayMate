package com.traymate.backend.admin.resident;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Gender {
    MALE,
    FEMALE,
    OTHER;

    @JsonCreator
    public static Gender fromString(String value) {
        if (value == null) return null;
        return Gender.valueOf(value.toUpperCase());
    }
}
