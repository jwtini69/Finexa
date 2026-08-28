package org.example.finexa.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.example.finexa.config.SecurityProperties;
import org.example.finexa.tenant.OrgUser;
import org.example.finexa.tenant.Role;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
public class JwtService {

    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final SecurityProperties securityProperties;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public JwtService(SecurityProperties securityProperties, ObjectMapper objectMapper) {
        this.securityProperties = securityProperties;
        this.objectMapper = objectMapper;
        this.clock = Clock.systemUTC();
    }

    public IssuedToken issueToken(OrgUser user) {
        Instant issuedAt = clock.instant();
        Instant expiresAt = issuedAt.plus(securityProperties.tokenTtl());

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");

        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", user.id().toString());
        claims.put("email", user.email());
        claims.put("organization_id", user.organizationId().toString());
        claims.put("role", user.role().name());
        claims.put("iat", issuedAt.getEpochSecond());
        claims.put("exp", expiresAt.getEpochSecond());

        String encodedHeader = encodeJson(header);
        String encodedPayload = encodeJson(claims);
        String signingInput = encodedHeader + "." + encodedPayload;
        String signature = sign(signingInput);

        return new IssuedToken(signingInput + "." + signature, expiresAt);
    }

    public Optional<CurrentUser> parse(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }

            String signingInput = parts[0] + "." + parts[1];
            byte[] expected = BASE64_URL_DECODER.decode(sign(signingInput));
            byte[] actual = BASE64_URL_DECODER.decode(parts[2]);
            if (!MessageDigest.isEqual(expected, actual)) {
                return Optional.empty();
            }

            Map<String, Object> claims = objectMapper.readValue(BASE64_URL_DECODER.decode(parts[1]), MAP_TYPE);
            long expiresAt = ((Number) claims.get("exp")).longValue();
            if (clock.instant().getEpochSecond() >= expiresAt) {
                return Optional.empty();
            }

            return Optional.of(new CurrentUser(
                    UUID.fromString((String) claims.get("sub")),
                    UUID.fromString((String) claims.get("organization_id")),
                    (String) claims.get("email"),
                    Role.valueOf((String) claims.get("role"))
            ));
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
    }

    private String encodeJson(Map<String, Object> value) {
        try {
            return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Unable to encode JWT", ex);
        }
    }

    private String sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    securityProperties.jwtSecret().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            ));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException ex) {
            throw new IllegalStateException("Unable to sign JWT", ex);
        }
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }
}
