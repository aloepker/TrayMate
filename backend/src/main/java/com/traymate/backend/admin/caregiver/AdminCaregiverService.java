package com.traymate.backend.admin.caregiver;

import com.traymate.backend.admin.caregiver.dto.CaregiverCardDto;
import com.traymate.backend.auth.model.User;
import com.traymate.backend.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminCaregiverService {

    private final UserRepository userRepository;

    public List<CaregiverCardDto> getCaregivers() {
        return userRepository.findByRole("ROLE_CAREGIVER")
                .stream()
                .map(u -> new CaregiverCardDto(
                        u.getId(),
                        u.getFullName(),
                        u.getEmail()
                ))
                .toList();
    }
}
