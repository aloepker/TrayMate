package com.traymate.backend.audit;

import com.traymate.backend.audit.dto.DietaryAuditEntryDto;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Read-only feed of dietary-profile changes for a resident.
 * Exposed to ROLE_ADMIN, ROLE_CAREGIVER, ROLE_KITCHEN_STAFF / ROLE_KITCHEN so each
 * role can see the same timeline when they open a resident's profile.
 */
@RestController
@RequestMapping("/residents")
@RequiredArgsConstructor
public class DietaryAuditController {

    private final DietaryAuditService service;

    @GetMapping("/{id}/dietary-audit")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAREGIVER','ROLE_KITCHEN_STAFF','ROLE_KITCHEN')")
    public List<DietaryAuditEntryDto> history(@PathVariable Integer id) {
        return service.history(id).stream()
                .map(DietaryAuditEntryDto::from)
                .toList();
    }
}
