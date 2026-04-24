package com.traymate.backend.coverage;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A flag that the dietary-compliance engine raised for a given
 * (resident, meal period) pair: every available meal for that period
 * is unsafe for this resident, so the kitchen / admin needs to plan a
 * substitute (or the resident's profile needs a second look).
 *
 * Lifecycle:
 *   ACTIVE        — freshly raised; shows in the alerts dashboard.
 *   ACKNOWLEDGED  — admin has seen it and is handling it (still "open"
 *                   from a coverage standpoint but visually demoted).
 *   RESOLVED      — re-evaluation found at least one safe meal again
 *                   (menu changed, resident profile changed, etc.).
 *
 * At most one non-RESOLVED row per (residentId, mealPeriod) — the
 * service enforces this via an upsert-style evaluate step.
 */
@Entity
@Table(name = "meal_coverage_alert")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealCoverageAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "resident_id", nullable = false)
    private Integer residentId;

    /** Breakfast / Lunch / Dinner. Matches the menu.mealperiod value. */
    @Column(name = "meal_period", nullable = false, length = 30)
    private String mealPeriod;

    /**
     * How many available meals were in scope during the last evaluation.
     * Useful context in the UI ("0 of 4 breakfast items safe").
     */
    @Column(name = "total_meals_considered", nullable = false)
    private Integer totalMealsConsidered;

    /** First time we noticed coverage was zero for this resident/period. */
    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt;

    /** Most recent re-evaluation stamp, even if state didn't change. */
    @Column(name = "last_evaluated_at", nullable = false)
    private Instant lastEvaluatedAt;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "acknowledged_by_user_id")
    private Long acknowledgedByUserId;

    @Column(name = "acknowledged_by_name", length = 200)
    private String acknowledgedByName;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_ACKNOWLEDGED = "ACKNOWLEDGED";
    public static final String STATUS_RESOLVED = "RESOLVED";
}
