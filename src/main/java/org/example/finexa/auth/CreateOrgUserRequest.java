package org.example.finexa.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.example.finexa.tenant.Role;

public record CreateOrgUserRequest(
        @Email @NotBlank @Size(max = 320) String email,
        @NotBlank @Size(min = 8, max = 128) String password,
        @NotNull Role role
) {
}
