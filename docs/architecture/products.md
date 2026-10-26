# The ecosystem products

Your second blueprint imagines fifteen products. This page maps each one onto the modules that would make it possible, so it is clear that none of them needs its own foundation. Status of every product: 📋 planned. None has code.

Everything organises around three promises: **Discover** (find what solves a problem), **Compose** (connect it into something working), **Create** (build, test, improve and share).

## Stages (from the blueprint, kept as the order of work)

1. **Foundation:** libraries, skills, tools, MCP integrations, model connectors, import and validation, basic security.
2. **Let people create:** workflow builder, agent orchestration, Skills Studio, Recipes, project workspaces.
3. **Make the ecosystem intelligent:** capability search, Compatibility Engine, recommendations, skill evaluation, execution history and recovery.
4. **Build the ecosystem:** Lab, community publishing, Benchmark, Technology Graph, learning tracks, creative collections.

## Map

| # | Product | Promise | Stage | Needs | Notes |
|---|---|---|---|---|---|
| 1 | **Discover** | Discover | 3 | Tool Registry, Connectors, Skills, a search index | Describe a goal; get capabilities and why each is needed |
| 2 | **Build** | Create | 3 | Orchestrator, Workflows, Skills, code generation tools | Idea to a working application, with review before anything runs |
| 3 | **Lab** | Discover | 4 | Workers (isolated), Verification | Try a repository safely before adopting it |
| 4 | **Compose** | Compose | 2 | Workflows, Tool Registry, Connectors | The visual workspace to connect capabilities |
| 5 | **Skills Studio** | Create | 2 | Skills, Verification, Orchestrator | Create and test a skill from a description |
| 6 | **Forge** | Create | 4 | Workers, Verification, Skills Studio | Make a tool that does not exist yet |
| 7 | **Intelligence** | Discover | 3 | Workflows, Connectors, Memory, Scheduler | Ongoing research and monitoring tasks |
| 8 | **Benchmark** | Discover | 4 | Verification, Workers, evaluation sets | Which tool actually works best, with evidence |
| 9 | **Graph** | Discover | 4 | Registry, Compatibility Engine | How technologies connect |
| 10 | **Workspace** | Create | 2 | Accounts, Artifacts, Workflows | A place to organise projects and resources |
| 11 | **Academy** | Create | 4 | Recipes, Workspace | Learning tracks built from real recipes |
| 12 | **Community** | Create | 4 | Skills, Recipes, moderation, versions | Publishing and sharing, reviewed before risky tools are allowed |
| 13 | **Studio** | Create | 4 | Bridge adapters (Blender, FL Studio), Workers | Audio, video, 3D and creative technology |
| 14 | **Recipes** | Compose | 2 | Workflows, Skills, Tool Registry | A tested, one-click combination for a real project |
| 15 | **Compatibility Engine** | all | 3 | Tool Registry, Verification | Prevents integration headaches; supports all three promises |

## What this means for the build order

- Products 4, 5, 10 and 14 need only the foundation plus workflows and skills, so they come first.
- Products 3, 6, 8, 12 and 13 need isolation and evaluation, so they come after workers and the Bridge exist.
- The three that touch everything are the Tool Registry (what exists), the Verification Engine (what works) and the Compatibility Engine (what fits together). They are built as modules first, and the products are screens over them.

## The experience the blueprint aims for

A person types what they want to build or accomplish. OpenLobs identifies the capabilities needed, recommends a combination with reasons and any credentials required, shows the proposed architecture for review, generates the workflow, lets the person test it on samples, finds what is missing, and saves it to their workspace. Eventually they publish it as a recipe. Every step of that journey uses a module on the map above.
