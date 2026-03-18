# Contributing to Humanoid Atlas

Thanks for your interest in contributing to Humanoid Atlas! This project maps the humanoid robotics supply chain and thrives on community contributions — especially data.

## Ways to Contribute

### 1. Data Contributions (Most Impactful)

The supply chain dataset lives in `src/data/` and is the core of the atlas. You can:

- **Add a new OEM** — a company building humanoid robots
- **Add a new supplier** — a component maker, tier-1 supplier, or raw material provider
- **Add supply relationships** — links between suppliers and OEMs
- **Update existing data** — correct specs, add missing fields, update statuses

#### Data files

| File | What it contains |
|------|-----------------|
| `src/data/companies.ts` | All companies (OEMs + suppliers) with specs and metadata |
| `src/data/relationships.ts` | Directed edges: who supplies what to whom |
| `src/data/components.ts` | Hardware component category definitions |
| `src/data/types.ts` | TypeScript interfaces — the schema everything must follow |

#### Adding a new company

1. Open `src/data/types.ts` and review the `Company` interface
2. Add your entry to `src/data/companies.ts`, following the existing format exactly
3. Required fields: `id`, `name`, `type`, `country`, `description`
4. Use lowercase snake_case for `id` (e.g., `fourier_robotics`)
5. Use valid `Country` codes: `US`, `CN`, `JP`, `DE`, `CH`, `KR`, `TW`, `NL`, `IL`, `NO`, `AU`, `CA`, `GLOBAL`
6. Use valid `EntityType` values: `oem`, `tier1_supplier`, `component_maker`, `raw_material`, `ai_compute`

#### Adding a supply relationship

1. Review the `SupplyRelationship` interface in `types.ts`
2. Add your entry to `src/data/relationships.ts`
3. `from` and `to` must reference existing company IDs
4. `component` should match existing component names used in the codebase
5. Include `description` with a source URL when possible

### 2. Bug Reports

Found something broken? [Open a bug report](https://github.com/kingjulio8238/humanoid-atlas/issues/new?template=bug.md).

### 3. Feature Requests

Have an idea? [Open a feature request](https://github.com/kingjulio8238/humanoid-atlas/issues/new?template=feature.md).

### 4. Code Contributions

UI improvements, new visualizations, performance fixes — all welcome.

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm (recommended) or npm

### Getting started

```bash
git clone https://github.com/kingjulio8238/humanoid-atlas.git
cd humanoid-atlas
pnpm install
cp .env.example .env.local
# Fill in GROQ_API_KEY (required for AI features)
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Useful commands

```bash
pnpm dev       # Start dev server
pnpm build     # Type-check + build
pnpm lint      # Run ESLint
pnpm preview   # Preview production build
```

## Pull Request Process

1. **Fork** the repo and create a branch from `main`
   ```bash
   git checkout -b feature/add-fourier-gr3
   ```
2. Make your changes
3. Ensure your code passes lint and build:
   ```bash
   pnpm lint
   pnpm build
   ```
4. Commit with a clear message describing what you added/changed
5. Push to your fork and open a Pull Request
6. Fill out the PR template
7. A maintainer will review your PR — expect feedback within a few days

### PR guidelines

- Keep PRs focused — one company, one feature, or one fix per PR
- Data PRs should include a source (URL, press release, official spec sheet)
- Don't modify unrelated files
- Ensure `pnpm lint` and `pnpm build` pass before submitting

## Bot Contributions

Humanoid Atlas has an automated agent (`@HumanoidAtlas` on X) that monitors community submissions and creates PRs. Bot PRs go through the same CI and review process as human PRs. They are labeled `community-contribution` and credit the original poster.

## Code Style

- TypeScript strict mode is enabled
- Follow existing patterns in the codebase
- No additional linting rules beyond what ESLint enforces
- Use the existing CSS class naming conventions in `App.css`

## Questions?

Open an issue or tag `@HumanoidAtlas` on X.
