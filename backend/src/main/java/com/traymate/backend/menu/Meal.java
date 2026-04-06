package com.traymate.backend.menu;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "meals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;

    @Column(length = 1000)
    private String ingredients;

    @Column(length = 1000)
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    private String mealtype;
    private String mealperiod;

    @Column(name = "time_range")
    private String timeRange;

    @Column(name = "allergen_info", columnDefinition = "TEXT")
    private String allergenInfo;

    @Column(columnDefinition = "TEXT")
    private String tags;

    @Column(name = "is_available")
    private boolean available;

    @Column(name = "is_seasonal")
    private boolean seasonal;

    @Column(length = 1000)
    private String nutrition;

    @Column(name = "Calories")
    private Integer calories;

    @Column(name = "Sodium")
    private Integer sodium;

    @Column(name = "Protein")
    private Integer protein;
}