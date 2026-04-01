package com.traymate.backend.mealOrders;

import com.traymate.backend.menu.Meal;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class OrderResponseDTO {
    private MealOrders order;
    private List<Meal> meals;
}