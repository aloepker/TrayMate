package com.traymate.backend.admin.kitchen.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class KitchenStaffDto {
    private Long id;
    private String name;
    private String email;
}
