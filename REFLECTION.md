# Reflection

**Sara / slaman:**

**Recitation group members (Task 2):** Sanjitha Govindan, Veronica Pak, Rebecca Sucgang, Thomas Cherian

---

### 1. Valid but weak

Pick a property you wrote that passes on the correct implementation but
kills few or no mutants. Why is it still a _valid_ property? Describe a
concrete bug (not one of our mutants) that it _would_ catch.

The invariant property "the result always has exactly five colors" that I wrote for matchGuess passes on the correct implementation but does not kill any mutants because every mutant returns five colors. This property is still valid because the spec guarantees one color per position of guess, so it can never raise a false alarm. It would catch an off-by-one bug like a loop written as for (i = 0; i < 4; i++) that builds up the result once per iteration, which would return only four colors.

### 2. A generator problem, not a property problem

Describe a mutant, from either task, that survived or was flaky because of
your **generator** rather than your property. What did the generator fail to
produce? How did you fix it? Paste the runner output from before and after.

The singlePass mutant was flaky because of my generator. My "never credits a letter more times than the secret contains it" property could already detect it, but picking from all 26 letters of the alphabet almost never produced words with repeated letters like AADAA, which the bug needs. I fixed it by mixing in words from small alphabets (fc.oneof(wordFrom(ALPHABET), wordFrom('ABC'), wordFrom('AB'))), so repeated letters became common, while keeping the full alphabet so letters missing from the secret still show up.

Runner output before:

~ singlePass flaky: killed in 1/5 runs by: never credits a letter more times than the secret contains it
Counterexample: ["AADAA","ADDAA"]
AssertionError: expected 2 to be less than or equal to 1

Runner output after:

✔ singlePass killed by: never credits a letter more times than the secret contains it
Counterexample: ["AAAAB","AAABB"]
AssertionError: expected 2 to be less than or equal to 1

### 3. Reading a counterexample

Paste one counterexample that the mutation runner printed for a killed
mutant. In 2–3 sentences, explain using the _specification_ why that input
exposes the bug.

✔ mergesIntegerNeighbors killed by: covers exactly the same points as the input
Counterexample: [[[2,2],[0,1]]]
AssertionError: point 1.5: expected true to be false

The spec says that the merged result must cover exactly the same points as the input, including non-integers like 1.5. The input [0,1] and [2,2] has a gap at 1.5, but the mutant merged them into [0,2] because it treated 1 and 2 as touching. My check found that the output covers 1.5 (true) while the input doesn't (false), which shows that the mutant filled in a gap it should have kept.

### 4. Your project

Name one function or module in your team's project that would benefit from
property-based testing. State two properties in English, name the pattern of
each, and describe the generator you'd need, including anything about its
inputs that a naive generator would get wrong.

For the project, I worked on implementing a read-only Tutor agent that runs a /explain command that gives the user a beginner-friendly breakdown of the specified file/folder and an optional quiz to test their understanding. I think that the permission check that decides which tools the Tutor agent can use (Permission.merge in packages/opencode/src/agent/agent.ts) would benefit from property-based testing.

An invariant property: for any tool call and any agent configuration, the Tutor is never allowed a tool that writes files or runs shell commands.

A metamorphic property: adding unrelated settings or extra tools to the configuration never changes the Tutor's permissions.

The generator would need to build tool calls from the real set of tool names, including write-like ones, and a mix of configurations. A naive generator that picks random strings as tool names would almost never produce a real write tool, so the invariant would pass without testing anything.
