package com.traymate.backend.messaging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;


import jakarta.transaction.Transactional;

import java.util.List;


public interface MessageRepository extends JpaRepository<Message, Long> {
    
    List<Message> findByReceiverId(Long receiverId);

    //get conversation
    @Query("""
        SELECT m FROM Message m
        WHERE (m.senderId = :userId AND m.receiverId = :otherUserId)
        OR (m.senderId = :otherUserId AND m.receiverId = :userId)
        ORDER BY m.createdAt ASC
    """)
    List<Message> getConversation(Long userId, Long otherUserId);
    
    //delete one specific message
    void deleteById(Long id);

    //delete the entire conversation
    @Transactional
    @Modifying
    @Query("""
        DELETE FROM Message m
        WHERE (m.senderId = :userId AND m.receiverId = :otherUserId)
        OR (m.senderId = :otherUserId AND m.receiverId = :userId)
    """)
    void deleteConversation(Long userId, Long otherUserId);

}
