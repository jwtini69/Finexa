package org.example.finexa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinexaApplication {

    public static void main(String[] args) {
        SpringApplication.run(FinexaApplication.class, args);
    }

}