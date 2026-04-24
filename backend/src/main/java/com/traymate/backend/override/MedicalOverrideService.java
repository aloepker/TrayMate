package com.traymate.backend.override;

import com.traymate.backend.admin.resident.Resident;
import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.compliance.DietaryComplianceService;
import com.traymate.backend.compliance.dto.ComplianceResult;
import com.traymate.backend.compliance.dto.ComplianceViolation;
import com.traymate.backend.compliance.dto.MealComplianceResult;
import com.traymate.backend.menu.Meal;
import com.traymate.backend.menu.MealRepository;
import com.traymate.backend.override.dto.CreateOverrideRequest;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Handles the lifecycle of MedicalOverrideRequest records:
 *   - create       (resident / caregiver / kitchen requests an override)
 *   - approve/deny (admin)
 *   - findMatch    (used by MealOrdersService to check whether an order
 *                   that would be compliance-blocked has a valid approval)
 *   - consume      (called after a successful approved order)
 *
 * An "approval" is scoped to (residentId, mealOfDay, targetDate,
 * exact meal id set). Changing the cart after approval invalidates the
 * approval and another request is needed.
 *
 * Approvals auto-expire after 24 hours so an abandoned approval can't
 * sit around forever waiting to be used.
 */
@Service
@RequiredArgsConstructor
public class MedicalOverrideService {

    private final MedicalOverrideRepository repo;
    private final ResidentRepository residentRepository;
    private final MealRepository mealRepository;
    private final DietaryComplianceService complianceService;
    private final OverrideAuthorizationService authz;

    private static final Duration APPROVAL_TTL = Duration.ofHours(24);

    // ── Creation ───────────────────────────────────────────────────

    @Transactional
    public MedicalOverrideRequest create(CreateOverrideRequest req) {
        if (req.getResidentId() == null) {
            throw new IllegalArgumentException("residentId is required");
        }
        if (req.getMealIds() == null || req.getMealIds().isEmpty()) {
            throw new IllegalArgumentException("mealIds is required");
        }
        if (req.getMealOfDay() == null || req.getMealOfDay().isBlank()) {
            throw new IllegalArgumentException("mealOfDay is required");
        }
        if (req.getTargetDate() == null) {
            throw new IllegalArgumentException("targetDate is required");
        }

        // Row-level auth: admin unrestricted, caregiver only for their residents.
        authz.assertCanRequestFor(req.getResidentId());

        // Capture a plain-text violations snapshot so the admin review UI
        // sees what the resident was trying to override, even if their
        // dietary profile changes before the decision is made.
        String violationsSnapshot = buildViolationsSnapshot(req.getResidentId(), req.getMealIds());

        ActingUser actor = currentUser();

        MedicalOverrideRequest entity = MedicalOverrideRequest.builder()
            .residentId(req.getResidentId())
            .requestedByUserId(actor.id)
            .requestedByName(actor.name)
            .requestedByRole(actor.role)
            .mealIds(normalizeMealIds(req.getMealIds()))
            .mealOfDay(req.getMealOfDay())
            .targetDate(req.getTargetDate())
            .violationsJson(violationsSnapshot)
            .reason(req.getReason())
            .status(MedicalOverrideRequest.STATUS_PENDING)
            .requestedAt(Instant.now())
            .build();

        return repo.save(entity);
    }

    // ── Admin decisions ────────────────────────────────────────────

    @Transactional
    public MedicalOverrideRequest approve(Integer id, String decisionReason) {
        return decide(id, MedicalOverrideRequest.STATUS_APPROVED, decisionReason, Instant.now().plus(APPROVAL_TTL));
    }

    @Transactional
    public MedicalOverrideRequest deny(Integer id, String decisionReason) {
        return decide(id, MedicalOverrideRequest.STATUS_DENIED, decisionReason, null);
    }

    private MedicalOverrideRequest decide(Integer id, String status, String reason, Instant expiresAt) {
        MedicalOverrideRequest request = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Override not found: " + id));

        if (!MedicalOverrideRequest.STATUS_PENDING.equals(request.getStatus())) {
            throw new IllegalStateException("Override already decided: status=" + request.getStatus());
        }

        // Admin only (plus self-approval block).
        authz.assertCanDecide(request);

        ActingUser actor = currentUser();
        request.setStatus(status);
        request.setDecidedByUserId(actor.id);
        request.setDecidedByName(actor.name);
        request.setDecisionReason(reason);
        request.setDecidedAt(Instant.now());
        request.setExpiresAt(expiresAt);
        return repo.save(request);
    }

    // ── Listing ────────────────────────────────────────────────────

    public List<MedicalOverrideRequest> listPending() {
        return repo.findByStatusOrderByRequestedAtDesc(MedicalOverrideRequest.STATUS_PENDING);
    }

    @Transactional
    public List<MedicalOverrideRequest> listForResident(Integer residentId) {
        // Scope: admin + kitchen unrestricted, caregiver only for assigned residents.
        authz.assertCanViewResident(residentId);
        List<MedicalOverrideRequest> list = repo.findByResidentIdOrderByRequestedAtDesc(residentId);
        expireOverdueApprovals(list);
        return list;
    }

    // ── Matching (used by order-placement path) ────────────────────

    /**
     * Return an approved, not-consumed, not-expired override that covers
     * exactly the given (resident, mealOfDay, targetDate, mealIds). If
     * multiple candidates exist (unlikely), return the most recent.
     */
    @Transactional
    public Optional<MedicalOverrideRequest> findActiveApproval(
        Integer residentId, String mealOfDay, LocalDate targetDate, List<Integer> mealIds
    ) {
        if (residentId == null || mealOfDay == null || targetDate == null || mealIds == null || mealIds.isEmpty()) {
            return Optional.empty();
        }
        String canonicalRequested = normalizeMealIds(mealIds);
        Instant now = Instant.now();
        List<MedicalOverrideRequest> approved = repo.findByResidentIdAndMealOfDayAndTargetDateAndStatus(
                residentId, mealOfDay, targetDate, MedicalOverrideRequest.STATUS_APPROVED
            );
        expireOverdueApprovals(approved);
        return approved.stream()
            .filter(o -> canonicalRequested.equals(normalizeStored(o.getMealIds())))
            .findFirst();
    }

    /** Mark an approval CONSUMED once the order it covers has been saved. */
    @Transactional
    public void consume(MedicalOverrideRequest override) {
        override.setStatus(MedicalOverrideRequest.STATUS_CONSUMED);
        repo.save(override);
    }

    // ── Helpers ────────────────────────────────────────────────────

    /**
     * Build a human-readable multi-line snapshot of the current compliance
     * violations so the admin review UI can show exactly what the requester
     * was trying to override. Format:
     *   [Meal Name]
     *     • Contains Dairy — resident is allergic
     *     • High sodium (800mg) — resident has Hypertension
     */
    private String buildViolationsSnapshot(Integer residentId, List<Integer> mealIds) {
        Resident resident = residentRepository.findById(residentId).orElse(null);
        if (resident == null) return "";
        List<Meal> meals = mealRepository.findAllById(mealIds);
        ComplianceResult result = complianceService.validate(resident, meals);

        StringBuilder sb = new StringBuilder();
        for (MealComplianceResult m : result.getMeals()) {
            if (m.getViolations().isEmpty()) continue;
            sb.append('[').append(m.getMealName()).append("]\n");
            for (ComplianceViolation v : m.getViolations()) {
                sb.append("  • ").append(v.getReason()).append('\n');
            }
        }
        return sb.toString().trim();
    }

    private String normalizeMealIds(List<Integer> ids) {
        return ids.stream().sorted().map(String::valueOf).collect(Collectors.joining(","));
    }

    private String normalizeStored(String stored) {
        if (stored == null || stored.isBlank()) return "";
        return Arrays.stream(stored.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(Integer::parseInt)
            .sorted()
            .map(String::valueOf)
            .collect(Collectors.joining(","));
    }

    private void expireOverdueApprovals(List<MedicalOverrideRequest> requests) {
        Instant now = Instant.now();
        for (MedicalOverrideRequest request : requests) {
            if (!MedicalOverrideRequest.STATUS_APPROVED.equals(request.getStatus())) continue;
            if (request.getExpiresAt() == null || request.getExpiresAt().isAfter(now)) continue;
            request.setStatus(MedicalOverrideRequest.STATUS_EXPIRED);
            repo.save(request);
        }
    }

    private ActingUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User u) {
            return new ActingUser(u.getId(), u.getFullName(), u.getRole());
        }
        return new ActingUser(null, "system", null);
    }

    private record ActingUser(Long id, String name, String role) {}
}
