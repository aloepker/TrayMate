package com.traymate.backend.compliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single rule violation detected against a meal for a given resident.
 * Mirrors the frontend ComplianceViolation shape in mealSafetyService.ts
 * so the two layers stay swappable.
 *
 * severity:
 *   "allergy"  — life-safety; hard block
 *   "medical"  — doctor-directed rule (sodium cap, diabetic sugar); hard block
 *   "dietary"  — religious / lifestyle restriction; hard block but lower priority
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceViolation {
    private String severity;
    private String category;
    private String reason;
    private String trigger;
}
