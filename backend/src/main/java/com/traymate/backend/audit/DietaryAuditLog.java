package com.traymate.backend.audit;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * One row per field-level change to a resident's dietary profile.
 * Written whenever `foodAllergies`, `medicalConditions`, `dietaryRestrictions`,
 * or `medications` is edited. Stays forever — this is the legal paper trail.
 */
@Entity
@Table(name = "dietary_audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DietaryAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "resident_id", nullable = false)
    private Integer residentId;

    /** "foodAllergies" | "medicalConditions" | "dietaryRestrictions" | "medications" */
    @Column(name = "field_name", nullable = false, length = 64)
    private String fieldName;

    @Column(name = "old_value", length = 2000)
    private String oldValue;

    @Column(name = "new_value", length = 2000)
    private String newValue;

    /** Who made the change — denormalized so the log survives user deletion. */
    @Column(name = "changed_by_user_id")
    private Long changedByUserId;

    @Column(name = "changed_by_name", length = 128)
    private String changedByName;

    @Column(name = "changed_by_role", length = 64)
    private String changedByRole;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;
}
