package com.traymate.backend.mealOrders;

import com.traymate.backend.menu.Meal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponseDTO {
    private MealOrders order;
    private List<Meal> meals;
    private String residentName;
    private String residentRoom;

    public OrderResponseDTO(MealOrders order, List<Meal> meals) {
        this(order, meals, null, null);
    }
}
