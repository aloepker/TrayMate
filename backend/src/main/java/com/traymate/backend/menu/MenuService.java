package com.traymate.backend.menu;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuService {
    private final MealRepository mealRepository;

    public List<Meal> getAllMeals(){
        return mealRepository.findAll();
    }

    public List<Meal> getAvailableMeals(){
        return mealRepository.findByAvailableTrue();
    }

    public List<Meal> getMealsByPeriod(String mealperiod){
        return mealRepository.findByMealperiodContainingIgnoreCase(mealperiod);
    }

    public List<Meal> getDrinks() {
        return mealRepository.findByMealtypeIgnoreCase("Beverage");
    }

    public List<Meal> getSides() {
        return mealRepository.findByMealtypeIgnoreCase("Side");
    }
}
