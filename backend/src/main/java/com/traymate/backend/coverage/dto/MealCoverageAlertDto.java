package com.traymate.backend.coverage.dto;

import com.traymate.backend.admin.resident.Resident;
import com.traymate.backend.coverage.MealCoverageAlert;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * API-facing shape of a meal-coverage alert. Includes the resident's
 * display name and room number so the admin list view doesn't need a
 * second round-trip.
 */
@Data
@Builder
public class MealCoverageAlertDto {

    private Integer id;
    private Integer residentId;
    private String residentName;
    private String residentRoom;
    private String mealPeriod;
    private Integer totalMealsConsidered;
    private Instant detectedAt;
    private Instant lastEvaluatedAt;
    private String status;
    private String acknowledgedByName;
    private Instant acknowledgedAt;
    private Instant resolvedAt;

    public static MealCoverageAlertDto from(MealCoverageAlert a, Resident r) {
        String name = null;
        String room = null;
        if (r != null) {
            String first = r.getFirstName() == null ? "" : r.getFirstName();
            String last  = r.getLastName()  == null ? "" : r.getLastName();
            name = (first + " " + last).trim();
            if (name.isEmpty()) name = null;
            room = r.getRoomNumber();
        }
        return MealCoverageAlertDto.builder()
            .id(a.getId())
            .residentId(a.getResidentId())
            .residentName(name)
            .residentRoom(room)
            .mealPeriod(a.getMealPeriod())
            .totalMealsConsidered(a.getTotalMealsConsidered())
            .detectedAt(a.getDetectedAt())
            .lastEvaluatedAt(a.getLastEvaluatedAt())
            .status(a.getStatus())
            .acknowledgedByName(a.getAcknowledgedByName())
            .acknowledgedAt(a.getAcknowledgedAt())
            .resolvedAt(a.getResolvedAt())
            .build();
    }
}
