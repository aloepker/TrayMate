package com.traymate.backend.admin.resident.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ResidentCardDto {
    private Integer id;
    private String fullName;
    private String roomNumber;
    private String foodAllergies;
}
