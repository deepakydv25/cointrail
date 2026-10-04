package com.deepak.cointrailapi.recurringtransaction;

import com.deepak.cointrailapi.transaction.Transaction;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "recurring_transaction_occurrences")
public class RecurringTransactionOccurrence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recurring_transaction_id", nullable = false)
    private RecurringTransaction recurringTransaction;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", unique = true)
    private Transaction transaction;

    @Column(name = "posted_at", nullable = false)
    private LocalDateTime postedAt;

    public RecurringTransactionOccurrence() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public RecurringTransaction getRecurringTransaction() { return recurringTransaction; }
    public void setRecurringTransaction(RecurringTransaction recurringTransaction) { this.recurringTransaction = recurringTransaction; }

    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }

    public Transaction getTransaction() { return transaction; }
    public void setTransaction(Transaction transaction) { this.transaction = transaction; }

    public LocalDateTime getPostedAt() { return postedAt; }
    public void setPostedAt(LocalDateTime postedAt) { this.postedAt = postedAt; }
}
