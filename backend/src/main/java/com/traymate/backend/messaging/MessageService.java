package com.traymate.backend.messaging;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.traymate.backend.auth.model.User;
import com.traymate.backend.auth.repository.UserRepository;
import com.traymate.backend.messaging.dto.ChatResponse;
import com.traymate.backend.messaging.dto.MessageResponse;
import com.traymate.backend.messaging.dto.SendMessageRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository repository;
    private final UserRepository userRepository;

    public MessageResponse sendMessage(Long senderId, SendMessageRequest req) {
        if (req == null || req.getReceiverId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "receiverId is required");
        }
        if (req.getContent() == null || req.getContent().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
        }
        if (!userRepository.existsById(req.getReceiverId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Message recipient was not found");
        }

        Message message = Message.builder()
                .senderId(senderId)
                .receiverId(req.getReceiverId())
                .content(req.getContent().trim())
                .createdAt(LocalDateTime.now())
                .isRead(false)
                .build();

        Message saved = repository.save(message);

        return MessageResponse.builder()
                .id(saved.getId())
                .senderId(saved.getSenderId())
                .receiverId(saved.getReceiverId())
                .content(saved.getContent())
                .createdAt(saved.getCreatedAt())
                .isRead(saved.getIsRead())
                .build();
    }

    public List<Message> getInbox(Long receiverId) {
        return repository.findByReceiverId(receiverId);
    }

    // full conversation + mark as read
    public List<Message> getConversation(Long userId, Long otherUserId) {
        if (otherUserId == null || !userRepository.existsById(otherUserId)) {
            return List.of();
        }

        List<Message> messages = repository.getConversation(userId, otherUserId);

        // auto mark as read
        messages.stream()
                .filter(m -> Objects.equals(m.getReceiverId(), userId) && !Boolean.TRUE.equals(m.getIsRead()))
                .forEach(m -> m.setIsRead(true));

        repository.saveAll(messages);

        return messages;
    }

    // new chat function
    public List<ChatResponse> getChats(Long userId) {
        try {
            return buildChats(userId);
        } catch (RuntimeException e) {
            log.warn("Failed to load message chat previews for user {}", userId, e);
            return List.of();
        }
    }

    private List<ChatResponse> buildChats(Long userId) {

        // Was: repository.getConversation(userId, userId), which only returned
        // self-messages and left the sidebar empty for real conversations.
        List<Message> allMessages = repository.findAllInvolvingUser(userId);

        Set<Long> userIds = allMessages.stream()
                .flatMap(msg -> Stream.of(msg.getSenderId(), msg.getReceiverId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, User> usersById = userRepository.findAllById(userIds)
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        Map<Long, Message> latestChats = new LinkedHashMap<>();

        for (Message msg : allMessages) {
            if (msg.getSenderId() == null || msg.getReceiverId() == null) {
                continue;
            }

            Long otherUserId = msg.getSenderId().equals(userId)
                    ? msg.getReceiverId()
                    : msg.getSenderId();

            if (otherUserId == null || !usersById.containsKey(otherUserId)) {
                continue;
            }

            // findAllInvolvingUser is sorted DESC, so the first entry per
            // partner is the newest.
            if (!latestChats.containsKey(otherUserId)) {
                latestChats.put(otherUserId, msg);
            }
        }

        return latestChats.values().stream()
                .map(msg -> {
                    User sender = usersById.get(msg.getSenderId());
                    User receiver = usersById.get(msg.getReceiverId());

                    return ChatResponse.builder()
                            .id(msg.getId())
                            .content(msg.getContent())
                            .createdAt(msg.getCreatedAt())
                            .isRead(msg.getIsRead())
                            .senderId(msg.getSenderId())
                            .receiverId(msg.getReceiverId())
                            .senderName(displayName(sender, msg.getSenderId()))
                            .receiverName(displayName(receiver, msg.getReceiverId()))
                            .build();
                })
                .toList();
    }

    // delete a single message
    public void deleteMessage(Long messageId) {
        repository.deleteById(messageId);
    }

    // delete chat (full conversation)
    public void deleteChat(Long userId, Long otherUserId) {
        repository.deleteConversation(userId, otherUserId);
    }

    private String displayName(User user, Long fallbackId) {
        if (user == null || user.getFullName() == null || user.getFullName().isBlank()) {
            return "User " + fallbackId;
        }
        return user.getFullName();
    }

}
