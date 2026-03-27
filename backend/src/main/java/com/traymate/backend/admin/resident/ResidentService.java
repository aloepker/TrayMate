package com.traymate.backend.admin.resident;

import com.traymate.backend.admin.resident.dto.CreateResidentRequest;
import com.traymate.backend.admin.resident.dto.UpdateResidentInfo;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ResidentService {

    private final ResidentRepository repository;

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

        return repository.save(resident);
    }

    //update reisdent info
    public Resident updateResident(Integer id, UpdateResidentInfo info){

        Resident resident = repository.findById(id)
                    .orElseThrow(()-> new RuntimeException("Residentnot found"));

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

        return repository.save(resident);

    }
}
