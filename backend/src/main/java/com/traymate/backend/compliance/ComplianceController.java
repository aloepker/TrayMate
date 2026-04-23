package com.traymate.backend.compliance;

import com.traymate.backend.compliance.dto.ComplianceCheckRequest;
import com.traymate.backend.compliance.dto.ComplianceResult;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Explicit compliance check endpoint. Frontends can pre-flight a cart
 * (or a single meal) before submitting to get full severity/violation
 * detail. Order placement itself (POST /mealOrders) re-runs the same
 * check server-side as the authoritative gate — never trust a pass here
 * as final approval.
 */
@RestController
@RequestMapping("/compliance")
@RequiredArgsConstructor
public class ComplianceController {

    private final DietaryComplianceService complianceService;

    @PostMapping("/check")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAREGIVER','ROLE_KITCHEN_STAFF','ROLE_USER','ROLE_RESIDENT')")
    public ComplianceResult check(@RequestBody ComplianceCheckRequest req) {
        if (req.getResidentId() == null) {
            throw new IllegalArgumentException("residentId is required");
        }
        return complianceService.check(req.getResidentId(), req.getMealIds());
    }
}
