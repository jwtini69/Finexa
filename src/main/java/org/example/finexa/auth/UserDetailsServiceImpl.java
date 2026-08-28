package org.example.finexa.auth;

import java.util.List;
import org.example.finexa.tenant.OrgUserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final OrgUserRepository orgUserRepository;

    public UserDetailsServiceImpl(OrgUserRepository orgUserRepository) {
        this.orgUserRepository = orgUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return orgUserRepository.findByEmail(username)
                .map(user -> new org.springframework.security.core.userdetails.User(
                        user.email(),
                        user.passwordHash(),
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name()))
                ))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
