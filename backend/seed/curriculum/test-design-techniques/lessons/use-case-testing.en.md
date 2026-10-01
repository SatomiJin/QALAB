Users do not care about single fields: they want to reach a goal, such as withdrawing cash or placing an order. A **use case** describes how an actor reaches that goal step by step, including what happens when things go differently or go wrong. **Use case testing** turns each of those paths into tests.

## The parts of a use case

| Part | Meaning | ATM example |
|---|---|---|
| **Actor** | Who interacts with the system: a person or another system | Bank customer, bank core system |
| **Goal** | What the actor wants | Withdraw cash |
| **Preconditions** | What must be true before | Card is valid, ATM is in service |
| **Main flow** | The normal, most common path to the goal | Insert card, PIN, amount, take cash |
| **Alternative flows** | Other paths that **still reach** the goal | Choose another amount, ask for a receipt |
| **Exception flows** | Paths where the goal is **not reached** | Wrong PIN, insufficient funds |
| **Postconditions** | What is true at the end | Balance reduced by the amount |

## Worked example: withdraw cash

**Main flow:**

1. The customer inserts the card.
2. The ATM asks for the PIN; the customer enters it.
3. The ATM checks the PIN with the bank system.
4. The customer selects 100 USD.
5. The bank system checks the balance and approves.
6. The ATM returns the card, then dispenses the cash.

**Alternative flows:**

* 4a. The customer enters a custom amount instead of a preset one.
* 6a. The customer asks for a receipt; the ATM prints it.

**Exception flows:**

* 3a. Wrong PIN: the ATM asks again; after the third wrong PIN it keeps the card.
* 5a. Insufficient funds: the ATM shows a message, dispenses nothing, the balance is unchanged.
* 6b. The ATM has run out of notes: the transaction is cancelled and nothing is charged.

## Deriving tests

* **One test for the main flow.** It proves the most common journey works end to end.
* **One test per alternative flow.** Each one leaves the main flow at its step and rejoins it.
* **One test per exception flow.** Expected results check what the user sees **and** what must not happen: no cash, no charge, no wrong state.
* **Check postconditions,** not just the last screen: after a withdrawal of 100 USD, the account balance must be exactly 100 USD lower.

Use cases also combine well with other techniques: the amount in step 4 is a field for EP and BVA, the three wrong PINs in 3a are a state transition model.

## Writing a test from a flow

For exception 5a the test case might look like this:

* **Preconditions:** account balance 50 USD, ATM in service, valid card.
* **Steps:** insert card, enter correct PIN, select 100 USD.
* **Expected result:** the message "Insufficient funds" is shown, no cash is dispensed, the card is returned, the balance is still 50 USD.

The precondition makes the exception happen on purpose: you must set up a balance below the amount, you cannot wait for it to occur by chance.

## Tips

* Exceptions are where defects are most likely, because developers think about the main flow first. Spend real time on them.
* If the use case has no exception flows, that is a review finding: ask what happens when the card is declined, the network drops, or the user goes back.
* Use cases describe system behaviour from the user's side, so they are also a good base for acceptance tests.

> Key idea: one test for the main flow, one for each alternative and exception flow, and always check what must not happen in the exceptions.
