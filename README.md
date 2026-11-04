# Personal Job Tracker

A personal website that lists jobs ranked by how well they match my CV, with a match percentage for each, and tracks my applications. It runs only on this computer.

## Run it

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:3000.

## Add your CV

Put your CV as a PDF or Word (.docx) file in this folder, next to this file. If there are several, the newest is used. Git ignores these files, so it stays on your computer.

## Where the jobs come from

- Company job boards for jobs in Türkiye. Edit the `BOARDS` list in `lib/sources.ts` to add a company.
- [Himalayas](https://himalayas.app) for remote jobs.
- Jobs you paste in by hand, for example from LinkedIn.

## Test it

```bash
npm test
npm run typecheck
```
