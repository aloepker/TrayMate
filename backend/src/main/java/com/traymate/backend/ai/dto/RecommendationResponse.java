package com.traymate.backend.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResponse {

    private Integer residentId;

    private String residentName;

    private String allergies;

    private String dietaryRestrictions;

    private String recommendation;
}