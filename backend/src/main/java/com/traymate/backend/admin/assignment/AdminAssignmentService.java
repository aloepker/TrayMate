package com.traymate.backend.admin.assignment;

import com.traymate.backend.admin.resident.Resident;
import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.auth.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminAssignmentService {

    private final ResidentRepository residentRepository;
    private final UserRepository userRepository;

    @Transactional
    public Resident assignResident(Integer residentId, Long caregiverId) {

        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() -> new RuntimeException("Resident not found"));

        if (caregiverId == null) {
            resident.setCaregiver(null);
        } else {
            User caregiver = userRepository.findById(caregiverId)
                    .orElseThrow(() -> new RuntimeException("Caregiver not found"));

            if (!"ROLE_CAREGIVER".equals(caregiver.getRole())) {
                throw new RuntimeException("User is not a caregiver");
            }

            resident.setCaregiver(caregiver);
        }

        return residentRepository.save(resident);
    }
}
