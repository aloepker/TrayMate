package com.traymate.backend.messaging.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserList {
    private Long id;
    private String fullName;
    private String role;
}
