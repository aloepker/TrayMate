package com.traymate.backend.menu.dto;

import lombok.*;

@Getter
@Setter
public class UpdateMeal {
    
    private String name;
    private String description;
    private String mealperiod;

    private Integer calories;
    private Integer sodium;
    private Integer protein;

    private String tags;

    private Boolean seasonal;
    private String imageUrl;
    private Boolean available;
}
