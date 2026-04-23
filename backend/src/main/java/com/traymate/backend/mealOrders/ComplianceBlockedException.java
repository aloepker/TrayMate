package com.traymate.backend.mealOrders;

import com.traymate.backend.compliance.dto.ComplianceResult;

/**
 * Thrown by MealOrdersService when an order (new or updated) contains at
 * least one meal that violates a resident's dietary profile. Carries the
 * full ComplianceResult so the controller can surface the violation list
 * to the client in a 422 response.
 */
public class ComplianceBlockedException extends RuntimeException {
    private final ComplianceResult result;

    public ComplianceBlockedException(ComplianceResult result) {
        super("COMPLIANCE_BLOCKED");
        this.result = result;
    }

    public ComplianceResult getResult() {
        return result;
    }
}
