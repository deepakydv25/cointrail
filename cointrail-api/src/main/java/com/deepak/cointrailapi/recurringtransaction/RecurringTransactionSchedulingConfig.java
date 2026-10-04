package com.deepak.cointrailapi.recurringtransaction;

import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.*;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.validation.annotation.Validated;
import java.time.*;

@Configuration
@EnableScheduling
@EnableConfigurationProperties(RecurringTransactionSchedulingConfig.Settings.class)
public class RecurringTransactionSchedulingConfig {
    @Bean("recurringClock")
    Clock recurringClock(Settings settings) {
        return Clock.system(ZoneId.of(settings.timezone()));
    }

    @Validated
    @ConfigurationProperties("app.recurring")
    public record Settings(@NotBlank String timezone, boolean enabled, @NotNull Duration pollInterval,
                           @Min(1) int templateBatchSize, @Min(1) int occurrenceBatchSize) {
        public Settings {
            if (timezone != null) ZoneId.of(timezone);
            if (pollInterval != null && (pollInterval.isZero() || pollInterval.isNegative()))
                throw new IllegalArgumentException("Recurring poll interval must be positive");
        }
    }
}
