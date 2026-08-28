package org.example.finexa.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrgRegistrationRequest(
        @NotBlank @Size(max = 160) String organizationName,
        @Email @NotBlank @Size(max = 320) String ownerEmail,
        @NotBlank @Size(min = 8, max = 128) String password
) {
}
