package com.deepak.cointrailapi.recurringtransaction;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import java.time.Clock;
import static org.assertj.core.api.Assertions.*;

class RecurringTransactionSchedulingConfigTest {
    private final ApplicationContextRunner runner=new ApplicationContextRunner()
        .withUserConfiguration(RecurringTransactionSchedulingConfig.class)
        .withPropertyValues("app.recurring.timezone=Europe/Berlin","app.recurring.enabled=false",
            "app.recurring.poll-interval=PT1M","app.recurring.template-batch-size=10","app.recurring.occurrence-batch-size=5");
    @Test void shouldBindAndScopeClockToConfiguredZone() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean("recurringClock",Clock.class).getZone().getId()).isEqualTo("Europe/Berlin");
        });
    }
    @Test void shouldRejectInvalidZoneIntervalAndBatchLimits() {
        for(String invalid:new String[]{"app.recurring.timezone=invalid-zone","app.recurring.poll-interval=PT0S",
            "app.recurring.template-batch-size=0","app.recurring.occurrence-batch-size=0"})
            runner.withPropertyValues(invalid).run(context -> assertThat(context).hasFailed());
    }
}
