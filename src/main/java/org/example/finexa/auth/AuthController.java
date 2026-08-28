package org.example.finexa.auth;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.example.finexa.tenant.OrgUserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;
    private final OrgUserRepository orgUserRepository;

    public AuthController(AuthService authService, OrgUserRepository orgUserRepository) {
        this.authService = authService;
        this.orgUserRepository = orgUserRepository;
    }

    @PostMapping("/orgs/register")
    public ResponseEntity<OrgRegistrationResponse> register(@Valid @RequestBody OrgRegistrationRequest request) {
        OrgRegistrationResponse response = authService.registerOrganization(request);
        return ResponseEntity
                .created(URI.create("/api/orgs/me"))
                .body(response);
    }

    @PostMapping("/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/orgs/users")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public List<OrgUserResponse> users() {
        return orgUserRepository.findAllByCurrentTenant()
                .stream()
                .map(OrgUserResponse::from)
                .toList();
    }

    @PostMapping("/orgs/users")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public ResponseEntity<OrgUserResponse> createUser(@Valid @RequestBody CreateOrgUserRequest request) {
        return ResponseEntity
                .created(URI.create("/api/orgs/users"))
                .body(authService.createUserInCurrentTenant(request));
    }
}
