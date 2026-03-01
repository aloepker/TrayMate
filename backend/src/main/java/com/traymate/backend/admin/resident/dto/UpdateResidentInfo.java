package com.traymate.backend.admin.resident.dto;

import lombok.Data;

@Data
public class UpdateResidentInfo {
   
    private String name;
    private String roomNumber;
    private String foodAllergies;
    private String medicalConditions;
}
