package com.traymate.backend.compliance.dto;

import lombok.Data;

import java.util.List;

/** POST /compliance/check body. */
@Data
public class ComplianceCheckRequest {
    private Integer residentId;
    private List<Integer> mealIds;
}
