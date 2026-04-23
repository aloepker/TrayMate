package com.traymate.backend.override.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/** POST /overrides body. */
@Data
public class CreateOverrideRequest {
    private Integer residentId;
    private List<Integer> mealIds;
    private String mealOfDay;
    private LocalDate targetDate;
    private String reason;
}
