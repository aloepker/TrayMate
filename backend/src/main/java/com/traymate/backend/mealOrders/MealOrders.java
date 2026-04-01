package com.traymate.backend.mealOrders;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "meal_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealOrders {
//
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "date")
    private LocalDate date;

    @Column(name = "meal_of_day", length = 9)
    private String mealOfDay; // Java: mealOfDay -> DB: meal_of_day

    @Column(name = "user_id", length = 8)
    private String userId; // Matching your varchar(8) requirement

    @Column(name = "status", length = 7)
    private String status; // pending, started, served

    @Column(name = "meal_items_id_numbers", length = 16)
    private String mealItemsIdNumbers;
}