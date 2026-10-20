1. The OpenLobs master blueprint
I'd build OpenLobs around 10 integrated systems.
SystemWhat it doesInitial scope1. LibrariesDiscovers, imports, and manages reusable code librariesInclude2. SkillsImports and manages agent skill packagesInclude3. ToolsProvides callable operations for agentsInclude4. MCPConnects agents to compatible MCP serversInclude5. WorkflowsComposes capabilities into reusable proceduresInclude6. Agent orchestrationCoordinates models, tools, skills, and workflow stepsInclude7. Model connectorsConnects to externally hosted modelsInclude8. Validation and evaluationTests compatibility, correctness, and reliabilityInclude9. Security and permissionsControls what imported components can accessInclude10. Runtime managementConnects to supported external execution environmentsLimited integration only 
What we're excluding: hosting large language models, GPU clusters, training infrastructure, and a general-purpose cloud computer for arbitrary user code.
You can still support agents powered by external model APIs and use lightweight services for ordinary operations.
One important caveat: even CPU-only code execution requires resource limits and isolation if users can submit arbitrary code.
2. System One: Libraries
This should be more than a list of package links.
What to build
A. Repository importer
Allow users to import a library from a supported GitHub repository.
The importer should:
• Retrieve repository metadata.
• Identify the programming language.
• Read the README and package manifests.
• Detect the license.
• Identify installation instructions.
• Extract dependencies.
• Identify potential compatibility issues.
• Create a structured OpenLobs resource entry.
Initially, import metadata and documentation rather than cloning every repository into your own infrastructure.
B. Package integration
For JavaScript and TypeScript, support package managers such as npm.
For Python, support pip-compatible package definitions.
OpenLobs can generate installation commands and example integration code without executing the package itself.
C. Compatibility information
Record:
• Supported languages.
• Minimum runtime versions.
• Dependencies.
• License.
• Known compatibility limitations.
• Last checked date.
• Test status.
D. Dependency relationships
If Library A depends on Library B, OpenLobs should represent that relationship.
This allows you to build dependency graphs and identify potential version conflicts.
Suggested implementation
• GitHub API for repository metadata.
• npm registry for JavaScript packages.
• PyPI for Python packages.
• PostgreSQL for catalog records and relationships.
• Background jobs for indexing and validation.
You do not need to host all the packages.
3. System Two: Skills
This is one of the most lightweight and valuable parts of the platform.
The Agent Skills specification and examples provide a practical starting point for supporting skills organized around SKILL.md, instructions, and optional supporting files. 
What to build
Skill importer
• Import a skill from a supported Git repository.
• Parse its metadata.
• Identify scripts and supporting files.
• Validate the directory structure.
• Record dependencies and permissions.
• Display its instructions.
Skill manager
• Install and uninstall skills from a user's workspace.
• Pin a specific version or commit.
• Update skills.
• Compare versions.
• Track compatibility with supported agent environments.
Skill discovery
• Search by capability.
• Filter by language or required tools.
• Show compatible models and integrations where known.
• Recommend skills for a particular task.
Skill execution integration
When an agent needs a skill, OpenLobs should make its instructions available to the agent through a supported integration.
However, the execution environment must be compatible with what the skill requires. A skill containing shell scripts, for example, cannot be executed merely by loading its Markdown instructions.
The key design decision
Keep the skill's instructions separate from the mechanism that executes its scripts.
This makes skills easier to reuse across different agents and environments.
4. System Three: Tools
A tool is an operation that an agent can invoke.
Examples include:
• Search the web.
• Read a file.
• Query a database.
• Extract webpage content.
• Search a repository.
• Generate a chart.
• Send an authorized notification.
What to build
Create a standard tool interface.
Every tool definition should specify:
{ "name": "search_repository", "description": "Search files in an authorized repository", "input_schema": { "query": "string", "repository": "string" }, "permissions": [ "repository:read" ], "execution_type": "external_api" } 
This is an illustrative schema, not a complete implementation.
The platform should validate tool inputs, enforce permissions, record execution results, and return structured outputs.
Avoid this mistake
Don't implement a different execution system for every tool.
Create a shared tool interface, then use adapters for individual providers.
For example:
OpenLobs Tool Interface | +-----+------+ | | | GitHub Firecrawl Database 
Each integration handles its provider-specific details.
5. System Four: MCP integration
MCP should be a first-class integration system rather than merely another list of repositories.
The official MCP TypeScript SDK documentation explains how compatible applications and servers exchange tools, resources, and prompts. 
What to build
MCP connection manager
• Register a supported server.
• Configure its connection details.
• Authenticate when required.
• Establish and monitor connections.
• Discover available tools.
• Validate tool input schemas.
• Handle connection failures.
MCP tool adapter
Translate discovered MCP tools into the common OpenLobs tool interface.
Permission manager
Allow users to control which tools an agent may access.
For example, a GitHub MCP connection might allow repository reading but not repository modification.
Connection health
Display whether a server is connected, disconnected, or returning errors.
Important architectural decision
Don't require every MCP server to run on your infrastructure.
Support compatible externally hosted servers and local servers where the user's environment permits them.
Local servers introduce an additional challenge: a cloud-hosted OpenLobs backend cannot directly launch processes on a user's phone or computer without an appropriate local client or companion application.
For the first version, prioritize externally reachable servers and clearly document the connection requirements.
6. System Five: Workflow engine
This is where individual capabilities become coordinated work.
Consider a workflow for researching a company:
User request | v Search for company | v Collect official sources | v Extract relevant information | v Verify important claims | v Generate report | v Evaluate final output 
What to build
Workflow editor
A visual interface where users can define steps and their relationships.
Workflow schema
Represent each workflow as structured data describing:
• Steps.
• Inputs.
• Outputs.
• Dependencies.
• Conditional branches.
• Retry policies.
• Approval requirements.
• Completion conditions.
Execution coordinator
Responsible for running steps in the correct order.
State management
Persist the current state so interrupted workflows can resume where appropriate.
Error handling
Support:
• Retries.
• Timeouts.
• Failure notifications.
• Cancellation.
• Manual approval.
• Recovery from recoverable errors.
Workflow templates
Users should be able to save and reuse successful workflows.
What I'd avoid initially
Don't build a distributed workflow cluster or a massive visual programming environment.
Start with sequential steps, conditional branching, retries, and persisted job state. Add parallel execution and more sophisticated scheduling when the basic system is reliable.
7. System Six: Agent orchestration
The orchestrator coordinates the model, skills, tools, and workflow.
For example, the user asks:
"Find five official grant opportunities suitable for a youth employment NGO in Ghana."
The orchestrator should:
• Interpret the task.
• Identify required capabilities.
• Select appropriate tools and skills.
• Execute the research process.
• Track the evidence collected.
• Detect missing information.
• Request additional research when needed.
• Return a structured result.
Build these components
ComponentResponsibilityTask interpreterConverts user requests into structured objectivesPlannerDetermines a suitable sequence of operationsCapability resolverFinds compatible skills and toolsExecution coordinatorDispatches operationsContext managerSupplies relevant instructions and informationState managerTracks task progressEvaluatorChecks results against requirementsRecovery managerHandles failures and incomplete work 
Use an existing agent framework where it fits.
For example, LangGraph provides graph-based orchestration capabilities, while Vercel AI SDK offers building blocks for AI applications.
You don't need to reinvent every orchestration primitive.
OpenLobs' value should come from integrating capabilities, managing compatibility, and making complex workflows easier to use.
8. System Seven: Model connectors
You don't need to host GPUs to support AI models.
Build a provider interface that connects to externally hosted model APIs.
What it should support
• Provider configuration.
• Secure API key management.
• Model selection.
• Streaming responses.
• Tool calling where supported.
• Structured outputs where supported.
• Usage tracking.
• Error handling.
• Provider-specific capability information.
Recommended architecture
OpenLobs Agent | Model Interface | +---+---+---+ | | | | API A API B API C 
The orchestrator should interact with a common interface rather than being tightly coupled to one provider.
You can evaluate a gateway such as LiteLLM if its capabilities and licensing suit your needs.
One important limitation: not every provider supports the same tool-calling features, context sizes, or structured output modes. Maintain a capability matrix rather than assuming every model is interchangeable.
9. System Eight: Validation and evaluation
This system determines whether components are usable and whether workflows produce satisfactory results.
Library validation
Check package manifests, dependency requirements, installation instructions, and available tests.
Skill validation
Check:
• Required metadata.
• Directory structure.
• Referenced files.
• Script syntax where supported.
• Declared dependencies.
• Potentially dangerous instructions.
Tool validation
Check:
• Input schema.
• Authentication.
• Permission requirements.
• Error responses.
• Output format.
Workflow evaluation
Check:
• Whether all required steps completed.
• Whether outputs satisfy their schemas.
• Whether important claims have supporting evidence.
• Whether failures were correctly reported.
• Whether the workflow met the user's requirements.
For code execution, use isolated test environments rather than running untrusted code inside the main application server.
A successful execution does not automatically mean a correct result. Evaluation should distinguish technical success from task success.
10. System Nine: Security and permissions
I would build this early, not as an afterthought.
OpenLobs will be importing community-created code, instructions, integrations, and workflows. These components cannot automatically be trusted.
Required protections
Credential management
• Store secrets in a secure backend.
• Never expose private API keys in public resource metadata.
• Restrict access to credentials by user and integration.
Permission controls
• Read-only versus write access.
• Explicit approval for sensitive operations.
• Restrictions on destructive actions.
• Per-integration authorization.
Import safety
• Inspect package manifests and scripts.
• Flag suspicious dependencies.
• Pin imported versions or commits.
• Record provenance.
• Allow users to review changes before updates.
Execution isolation
• Run untrusted code outside the main application process.
• Restrict network access where possible.
• Limit CPU, memory, disk, and execution time.
• Prevent access to application secrets.
• Clean up temporary execution environments.
Audit logging
• Record which component executed.
• Record what permissions it used.
• Record whether a user approved an action.
• Capture errors without logging secrets.
A skill's own instructions are not a security boundary. Permissions must be enforced by the execution system.
11. System Ten: Lightweight runtime management
This is the part we'll deliberately keep limited.
You said not to include heavy components that require substantial GPU resources. Agreed.
OpenLobs does not need to operate its own GPU fleet or host large models.
However, some skills and workflows still need somewhere to execute.
I'd support three execution modes.
ModeWhat happensRecommendationExternal APIOperations run through a provider's APISupport initiallyUser environmentLibraries and scripts run on the user's computerSupport through documented instructions or a later companion clientLightweight isolated workerOpenLobs runs supported, resource-limited operationsIntroduce selectively 
Don't promise arbitrary code execution unless you have the necessary isolation and resource controls.
Also, avoid launching a new container for every tiny operation if that would make the platform unnecessarily expensive. You can use managed execution services for suitable tasks and reserve stronger isolation for untrusted code.
12. The actual application architecture
Here's how I'd connect everything.
OPENLOBS FRONTEND | APPLICATION API | +------------------+------------------+ | | | Resource Service User Workspace Integration Service | | | +----+-----+ +----+-----+ +----+-----+ | | | | | | | | | Library Skill Tool Workflow Agent MCP Models APIs | | | | | | | | | +----+-----+-------+----+-----+-------+----+-----+ | EXECUTION COORDINATOR | +---------+----------+ | | External services Limited workers | | +---------+----------+ | Logs, results, evaluation 
For the underlying data, I'd consider:
• PostgreSQL: Users, resource metadata, versions, permissions, workflow definitions, and execution records.
• Object storage: Imported skill packages, supported artifacts, and generated files.
• Background job queue: Repository indexing, metadata refreshes, and longer-running tasks.
• Secret storage: Encrypted credentials and integration secrets.
• Observability: Structured logs, errors, execution timings, and usage records.
You don't necessarily need a separate microservice for every box. Start with a modular application and separate the execution workers when there is a concrete reason to do so.
13. The build order I'd follow
Even if your long-term goal is to build everything, the implementation should be staged.
PhaseDeliverable1Resource schemas, database, authentication, and permissions2Library and skill importers3Resource validation and version management4Tool interface and initial integrations5MCP connection management6Model provider interface7Basic agent orchestration8Workflow definitions and execution9Evaluation, logging, and recovery10Selective isolated execution and production hardening 
Build and test each phase before making the next one depend on it.
Since you're aiming to build a platform rather than a single agent, the shared interfaces matter more than the number of integrations you launch with.
If the resource schemas, permissions, and tool interface are designed well, adding another library or skill should not require rewriting the orchestrator.
Final recommendation
I'd make OpenLobs a modular, API-first platform for discovering and composing agent capabilities, with selective execution rather than a giant self-hosted AI infrastructure project.
The first production target should be:
• Library importing and management.
• Skill importing and management.
• A standard tool interface.
• MCP client integration.
• External model connections.
• Basic workflow orchestration.
• Validation and permissions.
• Lightweight, controlled execution.
That gives you the foundation for the larger vision without requiring a GPU fleet or a general-purpose cloud runtime.
And one final architectural detail: keep imported skills, libraries, tools, and workflows as distinct resource types, but let them declare relationships to one another. That's what will allow OpenLobs to compose them into useful systems instead of becoming just another directory of projects.