package com.traymate.backend.auth.seed;

import com.traymate.backend.auth.model.User;
import com.traymate.backend.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * seeds default users into the database when the application starts.
 * runs only once (when the user table is empty)
 */

@Component
@RequiredArgsConstructor
public class DataInitilizer implements CommandLineRunner {

    private final UserRepository repo;
    private final PasswordEncoder encoder;

    //executes automatically when the Spring Boot application starts
    @Override
    public void run(String... args) {

        //check if the database is empty to prevent duplicate users
        if (repo.count() == 0) {

            //create default Admin
            User admin = User.builder()
                    .fullName("System Admin")
                    .email("admin@traymate.com")
                    .password(encoder.encode("admin123"))
                    .role("ROLE_ADMIN")
                    .build();

            //create default caregiver
            User caregiver = User.builder()
                    .fullName("Test Caregiver")
                    .email("caregiver@traymate.com")
                    .password(encoder.encode("care123"))
                    .role("ROLE_CAREGIVER")
                    .build();

            //create default kitchen staff
            User kitchen = User.builder()
                    .fullName("Kitchen Staff")
                    .email("kitchen@traymate.com")
                    .password(encoder.encode("kitchen123"))
                    .role("ROLE_KITCHEN_STAFF")
                    .build();

            //save all users to the database
            repo.save(admin);
            repo.save(caregiver);
            repo.save(kitchen);

            System.out.println("Default users seeded");
        }
    }
}

