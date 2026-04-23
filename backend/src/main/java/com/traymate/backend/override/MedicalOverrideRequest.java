package com.traymate.backend.override;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A request from a resident / caregiver to bypass the dietary-compliance
 * gate for a single meal + date. Gets reviewed by an admin; if approved
 * the order-placement path will honor it once, then mark it CONSUMED so
 * future orders still go through the normal compliance check.
 */
@Entity
@Table(name = "medical_override_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalOverrideRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Resident the override applies to. */
    @Column(name = "resident_id", nullable = false)
    private Integer residentId;

    /** User who pressed "Request override" (may be resident, caregiver, kitchen). */
    @Column(name = "requested_by_user_id", nullable = false)
    private Long requestedByUserId;

    @Column(name = "requested_by_name", length = 200)
    private String requestedByName;

    @Column(name = "requested_by_role", length = 60)
    private String requestedByRole;

    /** Comma-separated meal ids this override covers ("3,5,7"). Order matters — see matches(). */
    @Column(name = "meal_ids", length = 200, nullable = false)
    private String mealIds;

    @Column(name = "meal_of_day", length = 20)
    private String mealOfDay;

    @Column(name = "target_date")
    private LocalDate targetDate;

    /** JSON snapshot of the violations at request time — useful for the admin review UI. */
    @Column(name = "violations_json", columnDefinition = "TEXT")
    private String violationsJson;

    /** Free-text reason the requester supplied. */
    @Column(name = "reason", length = 500)
    private String reason;

    /** PENDING / APPROVED / DENIED / EXPIRED / CONSUMED. */
    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "decided_by_user_id")
    private Long decidedByUserId;

    @Column(name = "decided_by_name", length = 200)
    private String decidedByName;

    @Column(name = "decision_reason", length = 500)
    private String decisionReason;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_DENIED = "DENIED";
    public static final String STATUS_EXPIRED = "EXPIRED";
    public static final String STATUS_CONSUMED = "CONSUMED";
}
