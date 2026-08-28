package org.example.finexa.tenant;

import java.time.Instant;
import java.util.UUID;

public record Organization(UUID id, String name, Instant createdAt) {
}
