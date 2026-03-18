package com.traymate.backend.admin.caregiver.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CaregiverCardDto {
    private Long id;
    private String name;
    private String email;
}
