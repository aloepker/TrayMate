package com.traymate.backend.override;

import com.traymate.backend.override.dto.CreateOverrideRequest;
import com.traymate.backend.override.dto.OverrideDecision;
import com.traymate.backend.override.dto.OverrideRequestDto;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST surface for the medical-override workflow.
 *
 * Anyone logged-in with a role that can act on behalf of a resident
 * (resident themselves, caregiver, kitchen staff, admin) can CREATE
 * a request. Only admins can APPROVE/DENY, and both admins + caregivers
 * can LIST pending so they can nudge the admin if needed.
 */
@RestController
@RequestMapping("/overrides")
@RequiredArgsConstructor
public class MedicalOverrideController {

    private final MedicalOverrideService service;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAREGIVER','ROLE_KITCHEN_STAFF','ROLE_USER','ROLE_RESIDENT')")
    public OverrideRequestDto create(@RequestBody CreateOverrideRequest req) {
        return OverrideRequestDto.from(service.create(req));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAREGIVER')")
    public List<OverrideRequestDto> listPending() {
        return service.listPending().stream().map(OverrideRequestDto::from).toList();
    }

    @GetMapping("/resident/{residentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAREGIVER','ROLE_KITCHEN_STAFF','ROLE_USER','ROLE_RESIDENT')")
    public List<OverrideRequestDto> listForResident(@PathVariable Integer residentId) {
        return service.listForResident(residentId).stream().map(OverrideRequestDto::from).toList();
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public OverrideRequestDto approve(@PathVariable Integer id, @RequestBody(required = false) OverrideDecision body) {
        String reason = body == null ? null : body.getReason();
        return OverrideRequestDto.from(service.approve(id, reason));
    }

    @PostMapping("/{id}/deny")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public OverrideRequestDto deny(@PathVariable Integer id, @RequestBody(required = false) OverrideDecision body) {
        String reason = body == null ? null : body.getReason();
        return OverrideRequestDto.from(service.deny(id, reason));
    }
}
