package com.traymate.backend.override.dto;

import lombok.Data;

/** POST /overrides/{id}/approve|deny body. */
@Data
public class OverrideDecision {
    private String reason;
}
