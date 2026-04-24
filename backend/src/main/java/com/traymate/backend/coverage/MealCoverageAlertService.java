package com.traymate.backend.coverage;

import com.traymate.backend.admin.resident.Resident;
import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.compliance.DietaryComplianceService;
import com.traymate.backend.compliance.dto.ComplianceResult;
import com.traymate.backend.compliance.dto.MealComplianceResult;
import com.traymate.backend.coverage.dto.MealCoverageAlertDto;
import com.traymate.backend.menu.Meal;
import com.traymate.backend.menu.MealRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Evaluates "is there any safe meal for this resident for this meal
 * period?" and maintains a backing MealCoverageAlert row when the answer
 * is no. This is the server-side early-warning system so kitchen/admin
 * see it before the resident hits a compliance-blocked order.
 *
 * Event-driven (not @Scheduled): evaluate is called whenever something
 * that could change the answer happens —
 *   - a resident's dietary profile is edited (ResidentService.updateResident)
 *   - a meal's availability is toggled (MenuService.setAvailability)
 *   - the admin manually triggers a batch re-evaluation
 *
 * Idempotent: calling evaluateResident twice with the same inputs won't
 * create a second row — we upsert by (residentId, mealPeriod) while a
 * non-RESOLVED row exists.
 */
@Service
@RequiredArgsConstructor
public class MealCoverageAlertService {

    private final MealCoverageAlertRepository repo;
    private final ResidentRepository residentRepository;
    private final MealRepository mealRepository;
    private final DietaryComplianceService complianceService;

    /**
     * Meal periods the kitchen actually serves and that we want to alert
     * on. If the menu schema grows to cover snacks etc. add them here.
     */
    private static final List<String> TRACKED_PERIODS = List.of("Breakfast", "Lunch", "Dinner");

    private static final List<String> OPEN_STATUSES = List.of(
        MealCoverageAlert.STATUS_ACTIVE,
        MealCoverageAlert.STATUS_ACKNOWLEDGED
    );

    // ── Listing (DTO-enriched so the UI has resident name/room inline) ─

    public List<MealCoverageAlertDto> listOpenDto() {
        List<MealCoverageAlert> alerts = repo.findByStatusInOrderByDetectedAtDesc(OPEN_STATUSES);
        return enrich(alerts);
    }

    public List<MealCoverageAlertDto> listForResidentDto(Integer residentId) {
        List<MealCoverageAlert> alerts = repo.findByResidentIdOrderByDetectedAtDesc(residentId);
        return enrich(alerts);
    }

    private List<MealCoverageAlertDto> enrich(List<MealCoverageAlert> alerts) {
        if (alerts.isEmpty()) return List.of();
        List<Integer> ids = alerts.stream()
            .map(MealCoverageAlert::getResidentId)
            .distinct()
            .collect(Collectors.toList());
        Map<Integer, Resident> byId = residentRepository.findAllById(ids).stream()
            .collect(Collectors.toMap(Resident::getId, r -> r));
        return alerts.stream()
            .map(a -> MealCoverageAlertDto.from(a, byId.get(a.getResidentId())))
            .collect(Collectors.toList());
    }

    // ── Admin acknowledge ──────────────────────────────────────────

    @Transactional
    public MealCoverageAlertDto acknowledge(Integer id) {
        MealCoverageAlert a = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + id));
        if (!MealCoverageAlert.STATUS_ACTIVE.equals(a.getStatus())) {
            throw new IllegalStateException(
                "Only ACTIVE alerts can be acknowledged (status=" + a.getStatus() + ")");
        }
        ActingUser actor = currentUser();
        a.setStatus(MealCoverageAlert.STATUS_ACKNOWLEDGED);
        a.setAcknowledgedByUserId(actor.id);
        a.setAcknowledgedByName(actor.name);
        a.setAcknowledgedAt(Instant.now());
        MealCoverageAlert saved = repo.save(a);
        Resident r = residentRepository.findById(saved.getResidentId()).orElse(null);
        return MealCoverageAlertDto.from(saved, r);
    }

    // ── Evaluation ─────────────────────────────────────────────────

    /**
     * Run compliance for every tracked meal period for this resident and
     * upsert alert rows accordingly. Silent no-op if the resident doesn't
     * exist (deleted mid-flight).
     */
    @Transactional
    public void evaluateResident(Integer residentId) {
        if (residentId == null) return;
        Resident resident = residentRepository.findById(residentId).orElse(null);
        if (resident == null) return;

        Instant now = Instant.now();
        for (String period : TRACKED_PERIODS) {
            evaluateOne(resident, period, now);
        }
    }

    /** Evaluate every resident. Returns how many were processed. */
    @Transactional
    public int evaluateAllResidents() {
        List<Resident> all = residentRepository.findAll();
        Instant now = Instant.now();
        for (Resident r : all) {
            for (String period : TRACKED_PERIODS) {
                evaluateOne(r, period, now);
            }
        }
        return all.size();
    }

    private void evaluateOne(Resident resident, String period, Instant now) {
        Optional<MealCoverageAlert> existing = repo.findFirstByResidentIdAndMealPeriodAndStatusIn(
            resident.getId(), period, OPEN_STATUSES);

        List<Meal> meals = mealRepository.findByMealperiodContainingIgnoreCaseAndAvailableTrue(period);

        // If the period has no meals at all, that's a menu-setup gap — not a
        // resident-specific dietary issue. Don't flag; flagging every
        // resident with the same "no dinner on the menu" noise would be
        // unhelpful. If a resident-specific alert was previously open for
        // this period, resolve it so it doesn't linger while the menu is
        // globally empty.
        if (meals.isEmpty()) {
            if (existing.isPresent()) {
                MealCoverageAlert e = existing.get();
                e.setStatus(MealCoverageAlert.STATUS_RESOLVED);
                e.setResolvedAt(now);
                e.setLastEvaluatedAt(now);
                repo.save(e);
            }
            return;
        }

        ComplianceResult result = complianceService.validate(resident, meals);
        long safeCount = result.getMeals().stream().filter(MealComplianceResult::isSafe).count();

        if (safeCount == 0) {
            if (existing.isPresent()) {
                MealCoverageAlert e = existing.get();
                e.setLastEvaluatedAt(now);
                e.setTotalMealsConsidered(meals.size());
                repo.save(e);
            } else {
                repo.save(MealCoverageAlert.builder()
                    .residentId(resident.getId())
                    .mealPeriod(period)
                    .totalMealsConsidered(meals.size())
                    .detectedAt(now)
                    .lastEvaluatedAt(now)
                    .status(MealCoverageAlert.STATUS_ACTIVE)
                    .build());
            }
        } else if (existing.isPresent()) {
            // Coverage is back — auto-resolve the open alert.
            MealCoverageAlert e = existing.get();
            e.setStatus(MealCoverageAlert.STATUS_RESOLVED);
            e.setResolvedAt(now);
            e.setLastEvaluatedAt(now);
            repo.save(e);
        }
        // else: no coverage issue and no existing alert → nothing to do.
    }

    // ── Acting-user lookup for acknowledge ─────────────────────────

    private ActingUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User u) {
            return new ActingUser(u.getId(), u.getFullName());
        }
        return new ActingUser(null, "system");
    }

    private record ActingUser(Long id, String name) {}
}
