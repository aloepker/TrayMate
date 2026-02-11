package com.traymate.backend.admin.resident;

import com.traymate.backend.admin.resident.dto.CreateResidentRequest;

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
}
