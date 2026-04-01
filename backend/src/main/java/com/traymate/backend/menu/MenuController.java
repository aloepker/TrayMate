package com.traymate.backend.menu;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/menu")
@RequiredArgsConstructor
public class MenuController {
    
    private final MenuService menuService;

    @GetMapping
    public List<Meal> getAllMeals(){
        return menuService.getAllMeals();
    }

    @GetMapping("/available")
    public List<Meal> getAvailableMeals(){
        return menuService.getAvailableMeals();
    }

    @GetMapping("/period/{mealperiod}")
    public List<Meal> getMealsByPeriod(@PathVariable String mealperiod) {
        return menuService.getMealsByPeriod(mealperiod);
    }

    @GetMapping("/period/drinks")
    public List<Meal> getDrinks() {
        return menuService.getDrinks();
    }

    @GetMapping("/period/sides")
    public List<Meal> getSides() {
        return menuService.getSides();  
    }
}
