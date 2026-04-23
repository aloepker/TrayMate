package com.traymate.backend.override.dto;

import com.traymate.backend.override.MedicalOverrideRequest;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/** Wire-format representation of a MedicalOverrideRequest. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OverrideRequestDto {
    private Integer id;
    private Integer residentId;
    private Long requestedByUserId;
    private String requestedByName;
    private String requestedByRole;
    private String mealIds;
    private String mealOfDay;
    private LocalDate targetDate;
    private String violationsJson;
    private String reason;
    private String status;
    private Long decidedByUserId;
    private String decidedByName;
    private String decisionReason;
    private Instant requestedAt;
    private Instant decidedAt;
    private Instant expiresAt;

    public static OverrideRequestDto from(MedicalOverrideRequest r) {
        return OverrideRequestDto.builder()
            .id(r.getId())
            .residentId(r.getResidentId())
            .requestedByUserId(r.getRequestedByUserId())
            .requestedByName(r.getRequestedByName())
            .requestedByRole(r.getRequestedByRole())
            .mealIds(r.getMealIds())
            .mealOfDay(r.getMealOfDay())
            .targetDate(r.getTargetDate())
            .violationsJson(r.getViolationsJson())
            .reason(r.getReason())
            .status(r.getStatus())
            .decidedByUserId(r.getDecidedByUserId())
            .decidedByName(r.getDecidedByName())
            .decisionReason(r.getDecisionReason())
            .requestedAt(r.getRequestedAt())
            .decidedAt(r.getDecidedAt())
            .expiresAt(r.getExpiresAt())
            .build();
    }
}
