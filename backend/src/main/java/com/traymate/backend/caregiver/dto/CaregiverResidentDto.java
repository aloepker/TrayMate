package com.traymate.backend.caregiver.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CaregiverResidentDto {
    
    private Integer id;
    private String firstName;
    private String lastName;
    private String roomNumber;
    private String medicalConditions;
    private String foodAllergies;
    private String medications;
}
