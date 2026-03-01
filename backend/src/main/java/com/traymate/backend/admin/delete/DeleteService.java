package com.traymate.backend.admin.delete;

import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeleteService {
    private final UserRepository userRepository;
    private final ResidentRepository residentRepository;

    public void deleteEntity(String type, Long id) {

        if (type.equalsIgnoreCase("resident")) {

            residentRepository.deleteById(id.intValue());

        } else if (type.equalsIgnoreCase("user")) {

            User user = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // If caregiver, unassign from residents first
            residentRepository.findAll().forEach(resident -> {
                if (resident.getCaregiver() != null &&
                        resident.getCaregiver().getId().equals(id)) {
                    resident.setCaregiver(null);
                    residentRepository.save(resident);
                }
            });

            userRepository.delete(user);

        } else {
            throw new RuntimeException("Invalid delete type");
        }
    }
}
