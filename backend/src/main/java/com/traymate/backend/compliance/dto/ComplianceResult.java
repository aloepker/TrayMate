package com.traymate.backend.compliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Aggregated compliance result for one resident + one or more meals.
 * `safe` is true iff every listed meal is safe (no violations).
 * `violations` is the flat list across all meals, ordered allergy → medical → dietary.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceResult {
    private Integer residentId;
    private boolean safe;
    private List<MealComplianceResult> meals;
    private List<ComplianceViolation> violations;
}
