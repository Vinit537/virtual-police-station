package com.virtualpolice.vps.support;

import org.springframework.test.web.servlet.ResultMatcher;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

public final class ApiErrorAssertions {
    private ApiErrorAssertions() {
    }

    public static ResultMatcher errorEnvelope(String code) {
        return result -> {
            jsonPath("$.code").value(code).match(result);
            jsonPath("$.message").isNotEmpty().match(result);
        };
    }

    public static ResultMatcher hasFieldErrors() {
        return jsonPath("$.fieldErrors").isMap();
    }
}
