package com.traymate.backend.messaging.dto;

import java.time.LocalDateTime;

import lombok.*;

@Getter
@Builder
public class ChatResponse {
    
    private Long id;
    private String content;
    private LocalDateTime createdAt;
    private Boolean isRead;

    private Long senderId;
    private Long receiverId;
    private String senderName;
    private String receiverName;
}
