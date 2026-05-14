package com.virtualpolice.vps.service;

import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class GeoRoutingService {
    private static final Map<String, String> STATION_BY_AREA = new LinkedHashMap<>();

    static {
        STATION_BY_AREA.put("vijay nagar", "Vijay Nagar Police Station");
        STATION_BY_AREA.put("indiranagar", "Indiranagar Police Station");
        STATION_BY_AREA.put("mg road", "MG Road Police Station");
        STATION_BY_AREA.put("whitefield", "Whitefield Police Station");
        STATION_BY_AREA.put("electronic city", "Electronic City Police Station");
    }

    public String assignNearestStation(String location) {
        if (location == null || location.isBlank()) {
            return "Central City Police Station";
        }
        String lowered = location.toLowerCase();
        return STATION_BY_AREA.entrySet().stream()
                .filter(entry -> lowered.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("Central City Police Station");
    }
}
