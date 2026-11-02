# Syllabus tree

Edit `data/syllabus.seed.json`. Stable IDs link exam, stage, paper, subject, topic and subtopic. Keep IDs unchanged when renaming nodes. The seed includes source URLs and page references for official UPSC 2026 and BPSC documents. Current BPSC paper structure follows the 72nd CCE advertisement; the older syllabus supplies subject coverage.

Common papers are expanded into topics and subtopics. Optional subjects are indexed by name; their specialist topic trees remain to be expanded. Editorial topic groupings paraphrase the official syllabus.

## Commands

- `npm run seed:syllabus`: apply versioned migration, seed nodes and index file-backed content. Existing tags survive reruns; removed seed nodes are archived.
- `npm run syllabus:untagged -- --output tmp/untagged-syllabus.csv`: export items needing tags. Optional `--kind mcq`, `study_material`, `current_affairs` or `planner_block` filters the report.
- `npm run syllabus:tag -- --storage file_catalog --kind mcq --id QUESTION_ID --node NODE_ID`: tag file-backed content. For database material use `--storage study_materials --id ID`; for planner blocks use `--storage planner_blocks --id ID --account-id ACCOUNT_ID`. Use `--node null` to clear a tag.

`study_materials` and `planner_blocks` have nullable foreign keys. Existing JSON question banks, news and static study files remain file-backed; `syllabus_content_items` stores their stable identities, source locations and nullable foreign keys without duplicating their content. Run the seed command after adding file-backed content. Untagged source files are intentionally not assigned guessed topics.

Authenticated `GET /api/syllabus-tree?exam=upsc` (or `bpsc`) returns ordered nodes. `GET /api/syllabus-tags?kind=mcq&id=QUESTION_ID` resolves file-backed tags; repeated `id` parameters are supported. Material publication and planner mutation accept nullable `syllabus_node_id` and reject unknown/inactive nodes.

## Syllabus page

The shared navigation opens `/syllabus`. Select UPSC/BPSC and a stage to expand papers, subjects, topics and subtopics. Topic status is saved per account as Not started, Reading or Revised. Completion is the percentage of topics marked Revised in the selected exam and stage; subtopics do not add extra completion units.

`GET /api/syllabus?exam=upsc` adds topic counts and account progress to the tree. Counts include tagged descendants and published database notes. MCQs and objective PYQs are counted separately; written Mains PYQs use catalog kind `pyq`. Untagged resources are excluded. Run `npm run seed:syllabus` after this update to index written PYQs, then use the tagging commands with `--kind pyq` as needed.

`PUT /api/syllabus/status` accepts `{node_id,status}`. `GET /api/syllabus/resources?node=NODE_ID&kind=notes` lists topic resources (`notes`, `mcq`, `pyq`, `current`). Question answers are checked server-side through `POST /api/syllabus/answer` with `{node_id,question_id,answer}`. Accuracy includes syllabus practice and tagged legacy quiz-bank/UPSC PYQ attempts, excluding skipped answers and Mains self-assessment. Practice answers and topic status belong to the signed-in account.

Run `npm run test:syllabus` for page behavior tests and `npx tsc --noEmit` for server type checks.

The migration runs automatically at server startup. Run the seed command separately before using the tree. The untagged report can contain private planner titles; keep it outside version control.
