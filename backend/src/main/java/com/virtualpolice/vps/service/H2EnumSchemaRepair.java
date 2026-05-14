package com.virtualpolice.vps.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
public class H2EnumSchemaRepair implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(H2EnumSchemaRepair.class);

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    public H2EnumSchemaRepair(DataSource dataSource, JdbcTemplate jdbcTemplate) {
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isH2()) {
            return;
        }
        repairStatusColumns();
    }

    private boolean isH2() {
        try (Connection connection = dataSource.getConnection()) {
            String productName = connection.getMetaData().getDatabaseProductName();
            return productName != null && productName.toLowerCase().contains("h2");
        } catch (Exception ex) {
            log.warn("Skipping H2 enum schema repair because DB metadata check failed: {}", ex.getMessage());
            return false;
        }
    }

    private void repairStatusColumns() {
        alterToVarchar("fir_reports", "status");
        alterToVarchar("status_logs", "status");
    }

    private void alterToVarchar(String table, String column) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " ALTER COLUMN " + column + " VARCHAR(64)");
            log.info("H2 enum schema repair applied on {}.{} -> VARCHAR(64)", table, column);
        } catch (Exception ex) {
            log.debug("H2 enum schema repair skipped for {}.{}: {}", table, column, ex.getMessage());
        }
    }
}
