package com.traymate.backend.mealOrders;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "meal_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealOrders {
//
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "date")
    private LocalDate date;

    @Column(name = "meal_of_day", length = 9)
    private String mealOfDay; // Java: mealOfDay -> DB: meal_of_day

    @Column(name = "user_id", length = 8)
    private String userId; // Matching your varchar(8) requirement

    // VARCHAR length must hold the longest valid status string.
    // Longest is "substitution_requested" (22 chars), so 32 leaves headroom.
    // Originally 7 — silently truncated "preparing"/"completed"/"cancelled"
    // on save, which surfaced as the resident-side "status never changes" bug.
    @Column(name = "status", length = 32)
    private String status; // pending, confirmed, preparing, ready, completed, cancelled, substitution_requested

    @Column(name = "meal_items_id_numbers", length = 16)
    private String mealItemsIdNumbers;

    // Email or name of the staff member who marked this order as preparing.
    // Optional; only set by the kitchen single/bulk status endpoints when
    // transitioning into "preparing". 200 is the same length as
    // resident.emergencyContact so it'll fit any user identifier we have.
    @Column(name = "cook", length = 200)
    private String cook;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "special_instructions", length = 1000)
    private String specialInstructions;

    // Real timestamp of when the order row was created. The existing
    // `date` field is a LocalDate (no time component) which the
    // frontend was parsing as UTC midnight — that's the origin of the
    // "every order shows 5pm" bug across all timezones.
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
