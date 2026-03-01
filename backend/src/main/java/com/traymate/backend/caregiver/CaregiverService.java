package com.traymate.backend.caregiver;

import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.caregiver.dto.CaregiverResidentDto;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CaregiverService {

    private final ResidentRepository residentRepository;

    public List<CaregiverResidentDto> getAssignedResidents() {

        User caregiver = (User) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return residentRepository.findByCaregiver_Id(caregiver.getId())
                .stream()
                .map(r -> CaregiverResidentDto.builder()
                        .id(r.getId())
                        .firstName(r.getFirstName())
                        .lastName(r.getLastName())
                        .roomNumber(r.getRoomNumber())
                        .medicalConditions(r.getMedicalConditions())
                        .foodAllergies(r.getFoodAllergies())
                        .medications(r.getMedications())
                        .build())
                .toList();
    }
}