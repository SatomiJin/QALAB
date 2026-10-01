Software testing is the work of **finding out how a product actually behaves** and comparing that with how it should behave, so that the team can decide whether it is ready.

## Testing is about information

A tester does not "make the software good". A tester produces information:

* what works as expected,
* what does not, and how badly,
* what has not been checked yet.

The team (product owner, developers, you) uses that information to decide: ship, fix first, or accept the risk.

## Why it is worth the cost

| Found during | Typical cost to fix |
|---|---|
| Requirements review | Minutes: change a sentence |
| Development | Hours: change code you just wrote |
| Testing | Hours to days: fix, rebuild, retest |
| Production | Days, plus support, data repair and reputation |

The later a problem is found, the more it costs. That is why testing starts **before** code exists: reviewing requirements is testing too.

## Verification and validation

* **Verification**: are we building the product right? (Does it match the specification?)
* **Validation**: are we building the right product? (Does it solve the user's problem?)

A feature can pass verification and still fail validation: it matches the spec, but the spec was wrong.

> Key idea: testing reduces the risk of failure in use. It cannot prove there are no defects.
