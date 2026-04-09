package com.traymate.backend.messaging.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MessageResponse {
    
    private Long id;
    private Long senderId;
    private Long receiverId;
    private String content;
    LocalDateTime createdAt;
    Boolean isRead;
}
