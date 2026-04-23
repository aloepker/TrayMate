package com.traymate.backend.compliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Per-meal result of a compliance check. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealComplianceResult {
    private Integer mealId;
    private String mealName;
    private boolean safe;
    private List<ComplianceViolation> violations;
}
