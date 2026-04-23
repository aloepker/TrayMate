package com.traymate.backend.admin.resident;

import com.traymate.backend.admin.resident.dto.CreateResidentRequest;
import com.traymate.backend.admin.resident.dto.UpdateResidentInfo;
import com.traymate.backend.audit.DietaryAuditService;
import com.traymate.backend.audit.DietaryAuditService.FieldDiff;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResidentService {

    private final ResidentRepository repository;
    private final DietaryAuditService auditService;

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
                .medications(req.getMedications())
                .roomNumber(req.getRoomNumber())
                .build();

        Resident saved = repository.save(resident);

        // Seed initial dietary values in the audit log (old = null, new = provided)
        auditService.recordAll(saved.getId(), List.of(
            new FieldDiff("foodAllergies",      null, saved.getFoodAllergies()),
            new FieldDiff("medicalConditions",  null, saved.getMedicalConditions()),
            new FieldDiff("medications",        null, saved.getMedications())
        ));

        return saved;
    }

    //update reisdent info
    public Resident updateResident(Integer id, UpdateResidentInfo info){

        Resident resident = repository.findById(id)
                    .orElseThrow(()-> new RuntimeException("Residentnot found"));

        // Snapshot the dietary fields BEFORE mutation so we can diff.
        String prevAllergies  = resident.getFoodAllergies();
        String prevConditions = resident.getMedicalConditions();

        // Split full name into first + last
        if (info.getName() != null && !info.getName().isBlank()) {
            String[] parts = info.getName().trim().split(" ");

            resident.setFirstName(parts[0]);

            if (parts.length > 1) {
                resident.setLastName(parts[parts.length - 1]);
            }
        }

        resident.setRoomNumber(info.getRoomNumber());
        resident.setFoodAllergies(info.getFoodAllergies());
        resident.setMedicalConditions(info.getMedicalConditions());

        Resident saved = repository.save(resident);

        // Record any dietary-profile changes. Service is a no-op per-field
        // when old == new, so unchanged fields don't create noise entries.
        List<FieldDiff> diffs = new ArrayList<>();
        diffs.add(new FieldDiff("foodAllergies",     prevAllergies,  saved.getFoodAllergies()));
        diffs.add(new FieldDiff("medicalConditions", prevConditions, saved.getMedicalConditions()));
        auditService.recordAll(saved.getId(), diffs);

        return saved;
    }
}
