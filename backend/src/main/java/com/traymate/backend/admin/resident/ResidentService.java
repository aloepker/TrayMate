package com.traymate.backend.admin.resident;

import com.traymate.backend.admin.resident.dto.CreateResidentRequest;
import com.traymate.backend.admin.resident.dto.UpdateResidentInfo;
import com.traymate.backend.audit.DietaryAuditService;
import com.traymate.backend.audit.DietaryAuditService.FieldDiff;
import com.traymate.backend.coverage.MealCoverageAlertService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResidentService {

    private final ResidentRepository repository;
    private final DietaryAuditService auditService;
    private final MealCoverageAlertService coverageAlertService;

    public Resident createResident(CreateResidentRequest req) {

        Resident resident = Resident.builder()
                .firstName(req.getFirstName())
                .middleName(req.getMiddleName())
                .lastName(req.getLastName())
                .dob(req.getDob())
                .gender(req.getGender())
                .phone(req.getPhone())
                .emergencyContact(req.getEmergencyContact())
                .emergencyPhone(req.getEmergencyPhone())
                .doctor(req.getDoctor())
                .doctorPhone(req.getDoctorPhone())
                .medicalConditions(req.getMedicalConditions())
                .foodAllergies(req.getFoodAllergies())
                .dietaryRestrictions(req.getDietaryRestrictions())
                .medications(req.getMedications())
                .roomNumber(req.getRoomNumber())
                .build();

        Resident saved = repository.save(resident);

        // Seed initial dietary values in the audit log (old = null, new = provided)
        auditService.recordAll(saved.getId(), List.of(
            new FieldDiff("foodAllergies",      null, saved.getFoodAllergies()),
            new FieldDiff("dietaryRestrictions", null, saved.getDietaryRestrictions()),
            new FieldDiff("medicalConditions",  null, saved.getMedicalConditions()),
            new FieldDiff("medications",        null, saved.getMedications())
        ));

        // First pass at coverage alerts — flag immediately if the new
        // resident's profile already excludes every meal on the menu.
        coverageAlertService.evaluateResident(saved.getId());

        return saved;
    }

    //update reisdent info
    public Resident updateResident(Integer id, UpdateResidentInfo info){

        Resident resident = repository.findById(id)
                    .orElseThrow(()-> new RuntimeException("Residentnot found"));

        // Snapshot the dietary fields BEFORE mutation so we can diff.
        String prevAllergies  = resident.getFoodAllergies();
        String prevDietary    = resident.getDietaryRestrictions();
        String prevConditions = resident.getMedicalConditions();
        String prevMeds       = resident.getMedications();

        // Split full name into first + last
        if (info.getName() != null && !info.getName().isBlank()) {
            String[] parts = info.getName().trim().split(" ");

            resident.setFirstName(parts[0]);

            if (parts.length > 1) {
                resident.setLastName(parts[parts.length - 1]);
            }
        }

        if (info.getRoomNumber() != null) {
            resident.setRoomNumber(info.getRoomNumber());
        }
        if (info.getFoodAllergies() != null) {
            resident.setFoodAllergies(info.getFoodAllergies());
        }
        if (info.getDietaryRestrictions() != null) {
            resident.setDietaryRestrictions(info.getDietaryRestrictions());
        }
        if (info.getMedicalConditions() != null) {
            resident.setMedicalConditions(info.getMedicalConditions());
        }
        if (info.getMedications() != null) {
            resident.setMedications(info.getMedications());
        }

        Resident saved = repository.save(resident);

        // Record any dietary-profile changes. Service is a no-op per-field
        // when old == new, so unchanged fields don't create noise entries.
        List<FieldDiff> diffs = new ArrayList<>();
        diffs.add(new FieldDiff("foodAllergies",     prevAllergies,  saved.getFoodAllergies()));
        diffs.add(new FieldDiff("dietaryRestrictions", prevDietary,  saved.getDietaryRestrictions()));
        diffs.add(new FieldDiff("medicalConditions", prevConditions, saved.getMedicalConditions()));
        diffs.add(new FieldDiff("medications",       prevMeds,       saved.getMedications()));
        auditService.recordAll(saved.getId(), diffs);

        // Re-evaluate meal coverage. Profile changes can either open a new
        // alert (resident now excluded from every meal in a period) or
        // auto-resolve an existing one (restriction lifted).
        coverageAlertService.evaluateResident(saved.getId());

        return saved;
    }
}
