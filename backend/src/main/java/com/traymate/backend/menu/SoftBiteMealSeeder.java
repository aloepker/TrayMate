package com.traymate.backend.menu;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SoftBiteMealSeeder implements CommandLineRunner {

    private final MealRepository mealRepository;

    private record SoftBiteMealSpec(
        String name,
        String ingredients,
        String description,
        String imageUrl,
        String mealtype,
        String mealperiod,
        String timeRange,
        String allergenInfo,
        String tags,
        boolean seasonal,
        int calories,
        int sodium,
        int protein,
        String nutrition
    ) {}

    private static final List<SoftBiteMealSpec> SOFT_BITE_MEALS = List.of(
        new SoftBiteMealSpec(
            "Soft Scrambled Eggs with Potatoes",
            "Eggs, Milk, Potatoes, Olive Oil, Parsley, Applesauce",
            "Soft scrambled eggs with tender diced potatoes and a smooth side of applesauce.",
            "https://cdn.pixabay.com/photo/2021/01/01/22/45/scrambled-eggs-5880191_1280.jpg",
            "B",
            "Breakfast",
            "7am - 10am",
            "Eggs, Dairy",
            "Soft Bite, Easy Chew, High Protein, Gluten-Free",
            false,
            310,
            360,
            17,
            "Calories: 310, Total Fat: 14g, Cholesterol: 285mg, Carbohydrate: 28g, Fiber: 3g, Sugar: 3g, Sodium: 360mg, Protein: 17g"
        ),
        new SoftBiteMealSpec(
            "Soft Oatmeal with Banana",
            "Rolled Oats, Banana, Cinnamon, Water",
            "Warm oatmeal cooked soft with sliced banana and a light cinnamon finish.",
            "https://images.pexels.com/photos/16144160/pexels-photo-16144160.jpeg?auto=compress&cs=tinysrgb&w=900",
            "B",
            "Breakfast",
            "7am - 10am",
            "",
            "Soft Bite, Easy Chew, Low Sodium, Heart Healthy",
            false,
            240,
            90,
            7,
            "Calories: 240, Total Fat: 4g, Cholesterol: 0mg, Carbohydrate: 49g, Fiber: 7g, Sugar: 12g, Sodium: 90mg, Protein: 7g"
        ),
        new SoftBiteMealSpec(
            "Soft Pancakes with Berry Compote",
            "Flour, Eggs, Milk, Baking Powder, Mixed Berries, Maple Syrup",
            "Tender pancakes served with warm berry compote for an easy-to-chew breakfast.",
            "https://images.pexels.com/photos/35672974/pexels-photo-35672974.jpeg?auto=compress&cs=tinysrgb&w=900",
            "B",
            "Breakfast",
            "7am - 10am",
            "Eggs, Dairy, Gluten",
            "Soft Bite, Easy Chew, Comfort",
            false,
            340,
            380,
            9,
            "Calories: 340, Total Fat: 9g, Cholesterol: 90mg, Carbohydrate: 57g, Fiber: 4g, Sugar: 18g, Sodium: 380mg, Protein: 9g"
        ),
        new SoftBiteMealSpec(
            "Soft Chicken and Rice Bowl",
            "Chicken, Rice, Carrots, Chicken Broth, Olive Oil, Parsley",
            "Pulled soft chicken over steamed rice with tender carrots and a light savory sauce.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Chicken_and_rice.jpg/800px-Chicken_and_rice.jpg",
            "L",
            "Lunch",
            "11am - 2pm",
            "",
            "Soft Bite, Bite-Sized, High Protein",
            false,
            430,
            430,
            30,
            "Calories: 430, Total Fat: 10g, Cholesterol: 95mg, Carbohydrate: 52g, Fiber: 4g, Sugar: 4g, Sodium: 430mg, Protein: 30g"
        ),
        new SoftBiteMealSpec(
            "Soft Turkey Meatloaf with Potatoes",
            "Ground Turkey, Potatoes, Egg, Breadcrumbs, Green Beans, Tomato Glaze",
            "Moist turkey meatloaf with mashed potatoes and soft green beans.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Meatloaf_%281%29.jpg/800px-Meatloaf_%281%29.jpg",
            "L",
            "Lunch",
            "11am - 2pm",
            "Eggs, Gluten",
            "Soft Bite, Easy Chew, High Protein, Comfort",
            false,
            410,
            520,
            32,
            "Calories: 410, Total Fat: 13g, Cholesterol: 115mg, Carbohydrate: 38g, Fiber: 5g, Sugar: 5g, Sodium: 520mg, Protein: 32g"
        ),
        new SoftBiteMealSpec(
            "Soft Tuna Rice Casserole",
            "Tuna, Rice, Peas, Cream Sauce, Cheddar Cheese, Parsley",
            "Creamy tuna and rice casserole baked until tender and easy to portion.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Tuna_casserole.JPG/800px-Tuna_casserole.JPG",
            "L",
            "Lunch",
            "11am - 2pm",
            "Fish, Dairy",
            "Soft Bite, Bite-Sized, High Protein, Comfort",
            false,
            360,
            480,
            24,
            "Calories: 360, Total Fat: 11g, Cholesterol: 55mg, Carbohydrate: 39g, Fiber: 3g, Sugar: 3g, Sodium: 480mg, Protein: 24g"
        ),
        new SoftBiteMealSpec(
            "Soft Baked Fish with Rice",
            "White Fish, Rice, Lemon, Dill, Olive Oil, Zucchini",
            "Flaky baked fish served over soft rice with mild lemon herb seasoning.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Baked_fish_rice_in_itamomo.jpg/800px-Baked_fish_rice_in_itamomo.jpg",
            "D",
            "Dinner",
            "4pm - 7pm",
            "Fish",
            "Soft Bite, Easy Chew, Low Sodium, High Protein",
            false,
            350,
            300,
            30,
            "Calories: 350, Total Fat: 8g, Cholesterol: 70mg, Carbohydrate: 40g, Fiber: 3g, Sugar: 1g, Sodium: 300mg, Protein: 30g"
        ),
        new SoftBiteMealSpec(
            "Soft Beef Stew",
            "Beef, Potatoes, Carrots, Peas, Beef Broth, Thyme",
            "Slow-simmered beef stew with soft potatoes, carrots, and peas.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Beef_stew_with_potatoes%2C_carrots%2C_celery%2C_and_peas_-_Massachusetts.jpg/800px-Beef_stew_with_potatoes%2C_carrots%2C_celery%2C_and_peas_-_Massachusetts.jpg",
            "D",
            "Dinner",
            "4pm - 7pm",
            "",
            "Soft Bite, Easy Chew, High Protein, Comfort",
            false,
            420,
            560,
            34,
            "Calories: 420, Total Fat: 16g, Cholesterol: 105mg, Carbohydrate: 33g, Fiber: 5g, Sugar: 5g, Sodium: 560mg, Protein: 34g"
        ),
        new SoftBiteMealSpec(
            "Soft Pasta with Meat Sauce",
            "Pasta, Ground Beef, Tomato Sauce, Parmesan Cheese, Basil",
            "Soft pasta tossed with a mild meat sauce and finely grated parmesan.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Pasta_with_meat_sauce_and_mushrooms_%2813134926073%29.jpg/800px-Pasta_with_meat_sauce_and_mushrooms_%2813134926073%29.jpg",
            "D",
            "Dinner",
            "4pm - 7pm",
            "Gluten, Dairy",
            "Soft Bite, Easy Chew, High Protein, Comfort",
            false,
            450,
            540,
            28,
            "Calories: 450, Total Fat: 15g, Cholesterol: 75mg, Carbohydrate: 52g, Fiber: 4g, Sugar: 6g, Sodium: 540mg, Protein: 28g"
        ),
        new SoftBiteMealSpec(
            "Spring Soft Herb Chicken with Vegetables",
            "Chicken, Rice, Spring Carrots, Peas, Herbs, Chicken Broth",
            "Tender herb chicken with soft spring vegetables in a light broth.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Roasted_Lemon_Herb_Chicken.jpg/800px-Roasted_Lemon_Herb_Chicken.jpg",
            "L",
            "Lunch",
            "11am - 2pm",
            "",
            "Soft Bite, Seasonal, High Protein, Low Sodium",
            true,
            390,
            360,
            31,
            "Calories: 390, Total Fat: 9g, Cholesterol: 95mg, Carbohydrate: 42g, Fiber: 5g, Sugar: 5g, Sodium: 360mg, Protein: 31g"
        ),
        new SoftBiteMealSpec(
            "Summer Soft Lemon Fish and Rice",
            "White Fish, Rice, Lemon, Summer Squash, Dill, Olive Oil",
            "Lemon baked fish with soft rice and summer vegetables.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Lemon_Fish.jpg/800px-Lemon_Fish.jpg",
            "D",
            "Dinner",
            "4pm - 7pm",
            "Fish",
            "Soft Bite, Seasonal, Low Sodium, High Protein",
            true,
            340,
            310,
            29,
            "Calories: 340, Total Fat: 7g, Cholesterol: 68mg, Carbohydrate: 39g, Fiber: 3g, Sugar: 3g, Sodium: 310mg, Protein: 29g"
        ),
        new SoftBiteMealSpec(
            "Fall Soft Turkey Sweet Potato Bowl",
            "Ground Turkey, Sweet Potatoes, Carrots, Turkey Broth, Sage",
            "Ground turkey with mashed sweet potatoes and tender fall vegetables.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Sweet_potato_fries_bowl_%2844260849040%29.jpg/800px-Sweet_potato_fries_bowl_%2844260849040%29.jpg",
            "L",
            "Lunch",
            "11am - 2pm",
            "",
            "Soft Bite, Seasonal, High Protein, Heart Healthy",
            true,
            410,
            390,
            30,
            "Calories: 410, Total Fat: 12g, Cholesterol: 85mg, Carbohydrate: 45g, Fiber: 7g, Sugar: 9g, Sodium: 390mg, Protein: 30g"
        ),
        new SoftBiteMealSpec(
            "Winter Soft Chicken Pot Pie Filling",
            "Chicken, Potatoes, Carrots, Peas, Cream Gravy, Thyme",
            "Soft chicken pot pie filling with tender vegetables and creamy gravy.",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Chicken_Pot_Pie%2C_cut_open.jpg/800px-Chicken_Pot_Pie%2C_cut_open.jpg",
            "D",
            "Dinner",
            "4pm - 7pm",
            "Dairy, Gluten",
            "Soft Bite, Seasonal, Comfort, High Protein",
            true,
            380,
            520,
            24,
            "Calories: 380, Total Fat: 14g, Cholesterol: 75mg, Carbohydrate: 39g, Fiber: 5g, Sugar: 6g, Sodium: 520mg, Protein: 24g"
        )
    );

    @Override
    public void run(String... args) {
        try {
            List<Meal> toSave = new ArrayList<>();
            int created = 0;
            int updated = 0;

            for (SoftBiteMealSpec spec : SOFT_BITE_MEALS) {
                Meal meal = mealRepository.findByNameIgnoreCase(spec.name()).orElseGet(Meal::new);
                boolean isNew = meal.getId() == null;

                meal.setName(spec.name());
                meal.setIngredients(spec.ingredients());
                meal.setDescription(spec.description());
                meal.setImageUrl(spec.imageUrl());
                meal.setMealtype(spec.mealtype());
                meal.setMealperiod(spec.mealperiod());
                meal.setTimeRange(spec.timeRange());
                meal.setAllergenInfo(spec.allergenInfo());
                meal.setTags(spec.tags());
                meal.setSeasonal(spec.seasonal());
                meal.setCalories(spec.calories());
                meal.setSodium(spec.sodium());
                meal.setProtein(spec.protein());
                meal.setNutrition(spec.nutrition());

                if (isNew) {
                    meal.setAvailable(true);
                    created++;
                } else {
                    updated++;
                }

                toSave.add(meal);
            }

            mealRepository.saveAll(toSave);
            log.info("[SoftBiteMealSeeder] Seed complete - created={}, updated={}", created, updated);
        } catch (Exception e) {
            log.warn("[SoftBiteMealSeeder] Failed to seed soft-bite meals: {}", e.getMessage());
        }
    }
}
