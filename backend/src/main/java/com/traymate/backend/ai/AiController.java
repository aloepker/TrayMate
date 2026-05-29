package com.traymate.backend.ai;

import com.traymate.backend.admin.resident.Resident;
import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.ai.dto.ChatRequest;
import com.traymate.backend.ai.dto.ChatResponse;
import com.traymate.backend.menu.Meal;
import com.traymate.backend.menu.MealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final ResidentRepository residentRepository;
    private final MealRepository mealRepository;

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    private final RestClient http = RestClient.create();

    /*
     * =========================================================
     * SINGLE AI ENDPOINT
     * =========================================================
     */

    @PostMapping
    public ResponseEntity<ChatResponse> handleAi(@RequestBody ChatRequest req) {

        try {
            if (req.getMessage() == null || req.getMessage().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(new ChatResponse("Message cannot be empty"));
            }

            String message = req.getMessage().toLowerCase();

            boolean isFoodRequest =
                    message.contains("eat") ||
                    message.contains("meal") ||
                    message.contains("food") ||
                    message.contains("breakfast") ||
                    message.contains("lunch") ||
                    message.contains("dinner") ||
                    message.contains("recommend");

            /*
             * =====================================================
             * 1. FOOD / MEAL RECOMMENDATION FLOW
             * =====================================================
             */
            if (isFoodRequest && req.getResidentId() != null) {

                Resident resident = residentRepository.findById(req.getResidentId())
                        .orElseThrow(() -> new RuntimeException("Resident not found"));

                String allergies = resident.getFoodAllergies() == null
                        ? ""
                        : resident.getFoodAllergies().toLowerCase();

                List<Meal> meals = mealRepository.findByAvailableTrue();

                List<Meal> safeMeals = meals.stream()
                        .filter(meal -> {

                            String ingredients = meal.getIngredients() == null
                                    ? ""
                                    : meal.getIngredients().toLowerCase();

                            String allergenInfo = meal.getAllergenInfo() == null
                                    ? ""
                                    : meal.getAllergenInfo().toLowerCase();

                            if (!allergies.isBlank()) {
                                for (String allergy : allergies.split(",")) {
                                    String a = allergy.trim();
                                    if (ingredients.contains(a) || allergenInfo.contains(a)) {
                                        return false;
                                    }
                                }
                            }

                            return true;
                        })
                        .limit(10)
                        .toList();

                StringBuilder mealText = new StringBuilder();

                for (Meal m : safeMeals) {
                    mealText.append("""
                            Meal: %s
                            Description: %s
                            Ingredients: %s
                            Tags: %s

                            """.formatted(
                            m.getName(),
                            m.getDescription(),
                            m.getIngredients(),
                            m.getTags()
                    ));
                }

                String prompt = """
                        You are a meal assistant for elderly residents.

                        ONLY recommend meals from this list:

                        %s

                        User request:
                        %s

                        Rules:
                        - Recommend max 3 meals
                        - Explain briefly why each is suitable
                        - Do NOT mention outside meals
                        """.formatted(mealText, req.getMessage());

                String aiText = callGemini(prompt);

                return ResponseEntity.ok(
                        new ChatResponse(aiText)
                );
            }

            /*
             * =====================================================
             * 2. NORMAL CHAT FLOW
             * =====================================================
             */

            String prompt = req.getMessage();

            String aiText = callGemini(prompt);

            return ResponseEntity.ok(
                    new ChatResponse(aiText)
            );

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(new ChatResponse("Error: " + ex.getMessage()));
        }
    }

    /*
     * =========================================================
     * GEMINI CALL WRAPPER
     * =========================================================
     */

    private String callGemini(String prompt) {

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                )
        );

        String url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                        "gemini-2.5-flash:generateContent?key=" +
                        geminiApiKey;

        Map response = http.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        List candidates = (List) response.get("candidates");

        Map first = (Map) candidates.get(0);
        Map content = (Map) first.get("content");
        List parts = (List) content.get("parts");

        return (String) ((Map) parts.get(0)).get("text");
    }
}