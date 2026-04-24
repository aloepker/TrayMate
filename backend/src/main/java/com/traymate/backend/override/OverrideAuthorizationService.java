package com.traymate.backend.override;

import com.traymate.backend.admin.resident.Resident;
import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.auth.model.User;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Central place for "who can do what" on medical-override records.
 *
 * The controller's @PreAuthorize clauses already gate on role (ADMIN,
 * CAREGIVER, KITCHEN_STAFF / KITCHEN). This service adds row-level checks on top
 * of that:
 *
 *   Admin       — unrestricted.
 *   Caregiver   — can only act on residents assigned to them.
 *   Kitchen     — read-only.
 *   Others      — blocked.
 *
 * Additionally the admin who originally FILED a request cannot be the
 * one who approves/denies it (self-approval prevention).
 *
 * Every assert method throws Spring's AccessDeniedException so callers
 * don't have to map to a 403 manually — the @ExceptionHandler in
 * SecurityExceptionHandler already surfaces that as 403.
 */
@Service
@RequiredArgsConstructor
public class OverrideAuthorizationService {

    private final ResidentRepository residentRepository;

    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_CAREGIVER = "ROLE_CAREGIVER";
    public static final String ROLE_KITCHEN_STAFF = "ROLE_KITCHEN_STAFF";
    public static final String ROLE_KITCHEN = "ROLE_KITCHEN";

    // ── Request creation ──────────────────────────────────────────

    /**
     * Admin may request for anyone. Caregiver may only request for
     * residents assigned to them. Kitchen + anonymous: denied.
     */
    public void assertCanRequestFor(Integer residentId) {
        User actor = requireUser();
        String role = actor.getRole();

        if (ROLE_ADMIN.equals(role)) return;

        if (ROLE_CAREGIVER.equals(role)) {
            requireCaregiverOfResident(actor, residentId);
            return;
        }

        throw new AccessDeniedException(
            "Your role cannot file override requests for residents.");
    }

    // ── Viewing a resident's records ──────────────────────────────

    /**
     * Admin, caregiver assigned to the resident, and kitchen staff can
     * all view a resident's override list. Caregiver is the scoped one.
     */
    public void assertCanViewResident(Integer residentId) {
        User actor = requireUser();
        String role = actor.getRole();

        if (ROLE_ADMIN.equals(role) || ROLE_KITCHEN_STAFF.equals(role) || ROLE_KITCHEN.equals(role)) return;

        if (ROLE_CAREGIVER.equals(role)) {
            requireCaregiverOfResident(actor, residentId);
            return;
        }

        throw new AccessDeniedException(
            "Your role cannot view override records for this resident.");
    }

    // ── Admin decisions ──────────────────────────────────────────

    /**
     * Admin-only, and not the same admin who filed the request. The
     * @PreAuthorize on the controller already gates on ROLE_ADMIN; this
     * adds the self-approval block.
     */
    public void assertCanDecide(MedicalOverrideRequest request) {
        User actor = requireUser();

        if (!ROLE_ADMIN.equals(actor.getRole())) {
            throw new AccessDeniedException("Only administrators can decide overrides.");
        }

        if (request.getRequestedByUserId() != null
            && request.getRequestedByUserId().equals(actor.getId())) {
            throw new AccessDeniedException(
                "You cannot approve or deny an override you filed yourself.");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────

    private void requireCaregiverOfResident(User actor, Integer residentId) {
        if (residentId == null) {
            throw new AccessDeniedException("Resident is required.");
        }
        Resident resident = residentRepository.findById(residentId).orElseThrow(() ->
            new AccessDeniedException("Resident not found."));

        User caregiver = resident.getCaregiver();
        if (caregiver == null || !caregiver.getId().equals(actor.getId())) {
            throw new AccessDeniedException(
                "This resident is not assigned to you.");
        }
    }

    private User requireUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User u)) {
            throw new AccessDeniedException("Not authenticated.");
        }
        return u;
    }
}
