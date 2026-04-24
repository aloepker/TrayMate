package com.traymate.backend.coverage;

import com.traymate.backend.coverage.dto.MealCoverageAlertDto;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST surface for meal-coverage alerts.
 *
 *   GET  /coverage-alerts                 — admin + kitchen see all open alerts
 *   POST /coverage-alerts/{id}/acknowledge — admin marks ACTIVE → ACKNOWLEDGED
 *   POST /coverage-alerts/re-evaluate      — admin-triggered full refresh
 *
 * The evaluation itself also runs implicitly whenever a dietary profile
 * is edited or a meal's availability is toggled; this controller is the
 * read surface plus the manual "re-check" escape hatch.
 */
@RestController
@RequestMapping("/coverage-alerts")
@RequiredArgsConstructor
public class MealCoverageAlertController {

    private final MealCoverageAlertService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_KITCHEN_STAFF','ROLE_KITCHEN')")
    public List<MealCoverageAlertDto> listOpen() {
        return service.listOpenDto();
    }

    @GetMapping("/resident/{residentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_KITCHEN_STAFF','ROLE_KITCHEN','ROLE_CAREGIVER')")
    public List<MealCoverageAlertDto> listForResident(@PathVariable Integer residentId) {
        return service.listForResidentDto(residentId);
    }

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public MealCoverageAlertDto acknowledge(@PathVariable Integer id) {
        return service.acknowledge(id);
    }

    @PostMapping("/re-evaluate")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public Map<String, Object> reEvaluate() {
        int n = service.evaluateAllResidents();
        return Map.of("residentsEvaluated", n);
    }
}
