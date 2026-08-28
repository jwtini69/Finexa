package org.example.finexa.auth;

import java.util.UUID;
import org.example.finexa.common.ConflictException;
import org.example.finexa.common.UnauthorizedException;
import org.example.finexa.tenant.OrgUser;
import org.example.finexa.tenant.OrgUserRepository;
import org.example.finexa.tenant.Organization;
import org.example.finexa.tenant.OrganizationRepository;
import org.example.finexa.tenant.Role;
import org.example.finexa.tenant.TenantContext;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final OrganizationRepository organizationRepository;
    private final OrgUserRepository orgUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            OrganizationRepository organizationRepository,
            OrgUserRepository orgUserRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.organizationRepository = organizationRepository;
        this.orgUserRepository = orgUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public OrgRegistrationResponse registerOrganization(OrgRegistrationRequest request) {
        UUID organizationId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        try {
            Organization organization = organizationRepository.save(organizationId, request.organizationName().trim());
            OrgUser owner = orgUserRepository.save(
                    ownerId,
                    organization.id(),
                    request.ownerEmail(),
                    passwordEncoder.encode(request.password()),
                    Role.OWNER
            );
            return new OrgRegistrationResponse(
                    organization.id(),
                    owner.id(),
                    organization.name(),
                    owner.email(),
                    organization.createdAt()
            );
        } catch (DuplicateKeyException ex) {
            throw new ConflictException("An account with this email already exists");
        }
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        OrgUser user = orgUserRepository.findByEmail(request.email())
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.passwordHash()))
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        JwtService.IssuedToken issuedToken = jwtService.issueToken(user);
        return new LoginResponse(
                issuedToken.value(),
                "Bearer",
                issuedToken.expiresAt(),
                user.id(),
                user.organizationId(),
                user.email(),
                user.role()
        );
    }

    @Transactional
    public OrgUserResponse createUserInCurrentTenant(CreateOrgUserRequest request) {
        try {
            OrgUser user = orgUserRepository.save(
                    UUID.randomUUID(),
                    TenantContext.requireOrganizationId(),
                    request.email(),
                    passwordEncoder.encode(request.password()),
                    request.role()
            );
            return OrgUserResponse.from(user);
        } catch (DuplicateKeyException ex) {
            throw new ConflictException("An account with this email already exists");
        }
    }
}
