package com.swyp.team5.platform.joongna.dto;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

public record JoongnaSession(String accessToken, String refreshToken) {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static JoongnaSession parse(String json) {
        try {
            JsonNode node = OBJECT_MAPPER.readTree(json);
            String accessToken = text(node.path("accessToken"));
            String refreshToken = text(node.path("refreshToken"));
            return accessToken == null || refreshToken == null ? null : new JoongnaSession(accessToken, refreshToken);
        } catch (RuntimeException e) {
            return null;
        }
    }

    public String toJson() {
        ObjectNode node = OBJECT_MAPPER.createObjectNode();
        node.put("accessToken", accessToken);
        node.put("refreshToken", refreshToken);
        return node.toString();
    }

    @Override
    public String toString() {
        return "JoongnaSession[masked]";
    }

    private static String text(JsonNode node) {
        return node.isMissingNode() || node.isNull() || node.asString().isBlank() ? null : node.asString();
    }
}
