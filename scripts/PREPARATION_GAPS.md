# Preparation gaps and website support

This is a qualitative product audit, not a representative student survey. The problem list combines individual aspirant accounts with missing workflows in this website. Individual reports cannot establish how common a problem is or whether a particular intervention improves examination outcomes.

| Preparation difficulty | Website support | Where |
| --- | --- | --- |
| Unclear starting point | Foundation route, official sources and PYQ links | Preparation Desk → preparation route |
| Resource overload | One core source / one practice source checklist | Preparation route |
| Limited time and inconsistency | 90/180/360-minute daily budgets, five completion blocks | Today's plan |
| Forgetting and revision backlog | Saved topics with suggested review intervals and recall feedback | Revision queue; save buttons in subject lessons |
| Current affairs overload | Brief-first reading, monthly navigation and saved news recall | Current affairs; revision queue |
| Difficult concepts | Existing original diagrams, map explainers, videos and flashcards | Subject lessons |
| Repeated test mistakes | Import incorrect/skipped Prelims questions, classify the cause, write a correction, schedule recall | Test review; mistake notebook |
| Difficulty writing answers | Prompt-specific saved drafts, word targets and a self-review checklist | Writing workspace; editorial question shortcut |
| Neglected CSAT | Six original numeracy/reasoning/comprehension questions with worked explanations; official Paper II link | CSAT practice |
| Neglected optional, essay or interview preparation | Optional comparison worksheet; original essay and interview reflection prompts | Preparation route; writing workspace |
| Progress is hard to see | Completed daily blocks and reviewed mistake counts | Today's plan; mistake notebook |
| An unsustainable routine | Shorter budgets, included breaks, weekly reflection and backlog guidance | Today's plan |

Sources reviewed:

- [Aspirants discussing preparation mistakes](https://www.reddit.com/r/UPSC/comments/1clddjv/) describe difficulties with revision, time management and stopping mock practice.
- [An individual revision experience](https://www.reddit.com/r/UPSC/comments/1iohdf1/) describes difficulty sustaining revision and weak mock performance.
- [A working aspirant's account](https://www.reddit.com/r/UPSCpreparation/comments/1u8e41x/is_my_upsc_preparation_too_weak_working_aspirant/) describes balancing employment, revision and practice.
- [Official UPSC papers](https://www.upsc.gov.in/examinations/previous-question-papers), [official exam information](https://www.upsc.gov.in/) and [NCERT textbooks](https://ncert.nic.in/textbook.php) anchor source navigation. Student comments are not exam rules.

New Preparation Desk data is saved locally under an account-specific key and can be exported as JSON. It is not synchronised to another device. Existing subject completion and editorial draft storage retain their existing behaviour. Suggested revision intervals are adjustable through repeat recall decisions and are not guaranteed learning outcomes.

CSAT is an original starter diagnostic, not a full Paper II bank or pass prediction. Writing review is self-assessment, not automatic or faculty marking. Optional and interview tools are planning/reflection support, not full subject courses or live mentoring. The website must not imply that these gaps are completely solved for every student.

Validation: `node scripts/test-preparation.mjs`, `node scripts/test-test-start.mjs`, the existing subject/visual/current-affairs/editorial checks, `node --check` on changed browser scripts, and `npx.cmd tsc --noEmit`.
