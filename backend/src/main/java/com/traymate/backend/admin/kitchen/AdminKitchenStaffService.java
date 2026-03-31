package com.traymate.backend.admin.kitchen;

import com.traymate.backend.admin.kitchen.dto.KitchenStaffDto;
import com.traymate.backend.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminKitchenStaffService {

    private final UserRepository userRepository;

    public List<KitchenStaffDto> getKitchenStaff() {
        return userRepository.findByRole("ROLE_KITCHEN_STAFF")
                .stream()
                .map(u -> new KitchenStaffDto(
                        u.getId(),
                        u.getFullName(),
                        u.getEmail()
                ))
                .toList();
    }
}