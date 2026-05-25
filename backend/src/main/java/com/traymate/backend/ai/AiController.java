package com.traymate.backend.ai;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.traymate.backend.admin.resident.Resident;
import com.traymate.backend.menu.MealRepository;
import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.ai.dto.ChatRequest;
import com.traymate.backend.ai.dto.ChatResponse;
import com.traymate.backend.ai.dto.RecommendationRequest;
import com.traymate.backend.ai.dto.RecommendationResponse;
import com.traymate.backend.menu.Meal;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final ResidentRepository residentRepository;
    private final MealRepository mealRepository;

    private static final Set<String> ALLOWED_MODELS = Set.of(
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite"
    );

    private static final String UPSTREAM_BASE =
        "https://generativelanguage.googleapis.com/v1beta/models";

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    private final RestClient http = RestClient.create();

    /*
     * =========================================================
     * CHAT ENDPOINT (ACTIVE)
     * =========================================================
     */

    @PostMapping("")
    public ResponseEntity<ChatResponse> chat(
            @RequestBody ChatRequest req) {

        try {
            if (req.getMessage() == null || req.getMessage().isBlank()) {
                return ResponseEntity.badRequest().body(
                        ChatResponse.builder()
                                .response("Message is required")
                                .build()
                );
            }

            String prompt = req.getMessage();

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
                    UPSTREAM_BASE +
                    "/gemini-2.5-flash:generateContent?key=" +
                    geminiApiKey;

            Map response = http.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            List candidates = (List) response.get("candidates");
            Map firstCandidate = (Map) candidates.get(0);
            Map content = (Map) firstCandidate.get("content");
            List parts = (List) content.get("parts");
            Map firstPart = (Map) parts.get(0);
            String aiText = (String) firstPart.get("text");

            return ResponseEntity.ok(
                    ChatResponse.builder()
                            .response(aiText)
                            .build()
            );

        } catch (Exception ex) {
            ex.printStackTrace();

            return ResponseEntity.internalServerError().body(
                    ChatResponse.builder()
                            .response("AI request failed: " + ex.getMessage())
                            .build()
            );
        }
    }

    /*
     * =========================================================
     * ERROR HELPER (LEGACY SUPPORT)
     * =========================================================
     */

    private static ResponseEntity<String> error(
            int status,
            String message) {

        String json =
            "{\"error\":{\"message\":\"" +
            message.replace("\"", "\\\"") +
            "\"}}";

        return ResponseEntity.status(HttpStatusCode.valueOf(status))
            .contentType(MediaType.APPLICATION_JSON)
            .body(json);
    }

    /*
     * =========================================================
     * RECOMMENDATION ENDPOINT (ACTIVE)
     * =========================================================
     */

    @PostMapping("/recommendation")
    public ResponseEntity<RecommendationResponse> getRecommendation(
            @RequestBody RecommendationRequest req) {

        try {

            Resident resident = residentRepository
                    .findById(req.getResidentId())
                    .orElseThrow(() ->
                            new RuntimeException("Resident not found"));

            String allergies =
                    resident.getFoodAllergies() == null
                            ? ""
                            : resident.getFoodAllergies().toLowerCase();

            String restrictions =
                    resident.getDietaryRestrictions() == null
                            ? ""
                            : resident.getDietaryRestrictions();

            List<Meal> meals = mealRepository.findByAvailableTrue();

            List<Meal> safeMeals = meals.stream()
                    .filter(meal -> {

                        String allergenInfo =
                                meal.getAllergenInfo() == null
                                        ? ""
                                        : meal.getAllergenInfo().toLowerCase();

                        String ingredients =
                                meal.getIngredients() == null
                                        ? ""
                                        : meal.getIngredients().toLowerCase();

                        if (!allergies.isBlank()) {

                            String[] allergyList = allergies.split(",");

                            for (String allergy : allergyList) {

                                String trimmed = allergy.trim();

                                if (allergenInfo.contains(trimmed)
                                        || ingredients.contains(trimmed)) {
                                    return false;
                                }
                            }
                        }

                        return true;
                    })
                    .limit(15)
                    .toList();

            StringBuilder mealText = new StringBuilder();

            for (Meal meal : safeMeals) {
                mealText.append("""
                    Meal: %s
                    Description: %s
                    Ingredients: %s
                    Tags: %s

                    """.formatted(
                        meal.getName(),
                        meal.getDescription(),
                        meal.getIngredients(),
                        meal.getTags()
                ));
            }

            String prompt = """
                You are a meal recommendation assistant for elderly residents.

                Resident dietary restrictions:
                %s

                User request:
                %s

                ONLY recommend meals from this safe list:

                %s

                Rules:
                - Recommend at most 3 meals
                - Keep responses concise
                - Explain briefly why each meal fits
                - NEVER mention meals outside the provided list
                """
                .formatted(
                    restrictions,
                    req.getQuestion(),
                    mealText
                );

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
                    UPSTREAM_BASE +
                    "/gemini-2.5-flash:generateContent?key=" +
                    geminiApiKey;

            Map response = http.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            List candidates = (List) response.get("candidates");
            Map firstCandidate = (Map) candidates.get(0);
            Map content = (Map) firstCandidate.get("content");
            List parts = (List) content.get("parts");
            Map firstPart = (Map) parts.get(0);
            String aiText = (String) firstPart.get("text");

            return ResponseEntity.ok(
                    RecommendationResponse.builder()
                            .residentId(resident.getId())
                            .residentName(
                                    resident.getFirstName()
                                            + " "
                                            + resident.getLastName()
                            )
                            .allergies(allergies)
                            .dietaryRestrictions(restrictions)
                            .recommendation(aiText)
                            .build()
            );

        } catch (Exception ex) {

            ex.printStackTrace();

            return ResponseEntity.internalServerError().body(
                    RecommendationResponse.builder()
                            .recommendation(
                                    "Recommendation failed: "
                                            + ex.getMessage()
                            )
                            .build()
            );
        }
    }
}