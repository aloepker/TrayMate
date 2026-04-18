package com.traymate.backend.messaging;

import java.util.List;

import org.springframework.stereotype.Service;

import com.traymate.backend.auth.model.User;
import com.traymate.backend.auth.repository.UserRepository;
import com.traymate.backend.messaging.dto.UserList;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserMessagingService {

    private final UserRepository userRepository;

    public List<UserList> getAllUsers(Long currentUserId) {

        List<User> users = userRepository.findAll();

        return users.stream()
                // exclude yourself
                .filter(user -> !user.getId().equals(currentUserId))
                .map(user -> UserList.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .role(user.getRole().toString())
                        .build())
                .toList();
    }
}