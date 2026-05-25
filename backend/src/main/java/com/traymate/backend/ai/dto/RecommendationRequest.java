package com.traymate.backend.ai.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RecommendationRequest {

    private Integer residentId;
    private String question;
}