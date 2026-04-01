package com.traymate.backend.mealOrders;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MealOrdersRepository extends JpaRepository<MealOrders, Integer> {

    // This tells Spring: "SELECT * FROM meal_orders WHERE user_id = ?"
    List<MealOrders> findByUserId(String userId);

    // Optional: If you want to see all "pending" orders for the kitchen
    List<MealOrders> findByStatus(String status);

    //to see all entries a meal period for a given day:
    List<MealOrders> findByMealOfDayAndDate(String mealOfDay, LocalDate date);

    //for checking if meal has been placed
    Optional<MealOrders> findByUserIdAndMealOfDayAndDate(String userId, String mealOfDay, LocalDate date);
}